import AiConfig from '../models/AiConfig.js';
import Order from '../models/Order.js'; 
import Product from '../models/Product.js'; 
import PendingMessage from '../models/PendingMessage.js'; 
import Conversation from '../models/Conversation.js'; // History Model
import { generateAIResponse } from '../services/aiService.js';
import { sendFacebookMessage } from '../services/facebookService.js';

// Security - No hardcoded fallback token
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
if (!VERIFY_TOKEN) {
    console.error("🚨 CRITICAL ERROR: META_VERIFY_TOKEN is missing in environment variables!");
}

export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

export const receiveMessage = async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'page') {
            const queuePromises = [];

            body.entry.forEach((entry) => {
                const pageId = entry.id;
                
                entry.messaging.forEach((webhook_event) => {
                    if (webhook_event.message && webhook_event.message.text && !webhook_event.message.is_echo) {
                        const senderPsid = webhook_event.sender.id;
                        const incomingText = webhook_event.message.text;
                        
                        console.log(`📩 [QUEUE PUSH] Page: ${pageId} | User: ${senderPsid}`);

                        queuePromises.push(
                            PendingMessage.create({
                                pageId: String(pageId),
                                senderPsid: String(senderPsid),
                                incomingText: incomingText,
                                status: 'pending'
                            })
                        );
                    }
                });
            });

            await Promise.all(queuePromises);
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Critical Error:", error);
        res.status(500).send('Server Error');
    }
};

// Helper Function: Array Chunking for Concurrency Limit
const chunkArray = (array, size) => {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
        array.slice(i * size, i * size + size)
    );
};

export const processMessageQueue = async (req, res) => {
    try {
        console.log("⏰ [CRON HIT]: Executing Enterprise Queue Processor...");

        // ==========================================
        // ATOMIC LOCK (Zero Race Condition)
        // ==========================================
        const lockedMessages = [];
        const BATCH_SIZE = 50;

        for (let i = 0; i < BATCH_SIZE; i++) {
            const lockedMsg = await PendingMessage.findOneAndUpdate(
                { status: 'pending' },
                { $set: { status: 'processing' } },
                { sort: { createdAt: 1 }, new: true }
            );
            if (!lockedMsg) break; 
            lockedMessages.push(lockedMsg);
        }

        if (lockedMessages.length === 0) {
            return res.status(200).json({ success: true, message: "No pending messages." });
        }

        // ==========================================
        // BATCH DB LOAD (Config & Product)
        // ==========================================
        const uniquePageIds = [...new Set(lockedMessages.map(m => m.pageId))];

        const configs = await AiConfig.find({
            "integrations.facebook.pageId": { $in: uniquePageIds },
            "integrations.facebook.isConnected": true
        });

        const configMap = {};
        const uniqueUserIds = [];
        configs.forEach(cfg => {
            configMap[cfg.integrations.facebook.pageId] = cfg;
            if (!uniqueUserIds.includes(cfg.user.toString())) {
                uniqueUserIds.push(cfg.user.toString());
            }
        });

        const products = await Product.find({
            user: { $in: uniqueUserIds },
            status: 'Active'
        });

        const productMap = {};
        products.forEach(p => {
            const uId = p.user.toString();
            if (!productMap[uId]) productMap[uId] = [];
            productMap[uId].push(p);
        });

        // ==========================================
        // IN-MEMORY RPM (Fixed Minute Window)
        // ==========================================
        const messagesToProcess = [];
        const configUpdates = new Map();
        
        const now = new Date();
        const currentMinute = new Date(now).setSeconds(0, 0); 

        for (let msg of lockedMessages) {
            let config = configUpdates.get(msg.pageId) || configMap[msg.pageId];

            if (!config || !config.autoReply) {
                PendingMessage.findByIdAndDelete(msg._id).catch(err => console.error("Zombie delete error:", err));
                continue;
            }

            const sub = config.subscription;

            if (sub.expiryDate && new Date(sub.expiryDate) < now) {
                PendingMessage.findByIdAndUpdate(msg._id, { status: 'pending' }).catch(err => console.error("Unlock error:", err));
                continue;
            }

            const lastMsgMinute = new Date(sub.lastMessageTimestamp || 0).setSeconds(0, 0);
            if (lastMsgMinute < currentMinute) {
                sub.rpmUsed = 0;
            }

            if (sub.rpmUsed >= sub.rpmLimit || sub.monthlyUsed >= sub.monthlyLimit) {
                PendingMessage.findByIdAndUpdate(msg._id, { status: 'pending' }).catch(err => console.error("Unlock error:", err));
                continue;
            }

            sub.rpmUsed += 1;
            sub.monthlyUsed += 1;
            sub.lastMessageTimestamp = now;
            
            configUpdates.set(msg.pageId, config);
            messagesToProcess.push({ msg, config });
        }

        // Bulk config update
        if (configUpdates.size > 0) {
            const bulkConfigOps = Array.from(configUpdates.values()).map(cfg => ({
                updateOne: {
                    filter: { _id: cfg._id },
                    update: { $set: {
                        "subscription.rpmUsed": cfg.subscription.rpmUsed,
                        "subscription.monthlyUsed": cfg.subscription.monthlyUsed,
                        "subscription.lastMessageTimestamp": cfg.subscription.lastMessageTimestamp
                    }}
                }
            }));
            await AiConfig.bulkWrite(bulkConfigOps);
        }

        // ==========================================
        // CONCURRENCY LIMIT & CORE LOGIC
        // ==========================================
        console.log(`🚀 Dispatching ${messagesToProcess.length} messages (Max 10 per batch)...`);
        
        const CONCURRENCY_LIMIT = 10;
        const chunks = chunkArray(messagesToProcess, CONCURRENCY_LIMIT);

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async ({ msg, config }) => {
                try {
                    // ==========================================
                    // API Key Selection Logic (BYOK)
                    // ==========================================
                    let activeApiKey = "";
                    if (config.clientApiKey && config.clientApiKey.trim() !== "") {
                        activeApiKey = config.clientApiKey;
                    } else if (config.useSystemApiKey) {
                        activeApiKey = process.env.GEMINI_API_KEY;
                    }

                    if (!activeApiKey) {
                        console.log(`⚠️ Page ${msg.pageId} has no AI API Key configured. Message skipped.`);
                        await PendingMessage.findByIdAndDelete(msg._id);
                        return; 
                    }

                    const uId = config.user.toString();
                    const activeProducts = productMap[uId] || [];

                    let catalogContext = "\n\n--- INVENTORY DATA ---\nHere are the ONLY products currently available in stock:\n";
                    if (activeProducts.length > 0) {
                        activeProducts.forEach(p => {
                            catalogContext += `- ${p.name} (Category: ${p.category}, Price: ৳${p.price}, Sizes: ${p.sizes.join(', ')})\n`;
                        });
                    } else {
                        catalogContext += "Currently, no products are available in stock.\n";
                    }
                    catalogContext += "\nCRITICAL RULE: Reply ONLY with valid JSON if triggering an order. Do not wrap JSON in markdown.\n----------------------";

                    const finalDynamicPrompt = config.systemPrompt + catalogContext;

                    // ==========================================
                    // CHAT HISTORY (MEMORY) LOGIC
                    // ==========================================
                    let conversation = await Conversation.findOne({ senderId: msg.senderPsid, pageId: msg.pageId });
                    
                    if (!conversation) {
                        conversation = new Conversation({
                            senderId: msg.senderPsid,
                            pageId: msg.pageId,
                            messages: []
                        });
                    }

                    conversation.messages.push({ role: 'user', content: msg.incomingText });

                    if (conversation.messages.length > 20) {
                        conversation.messages = conversation.messages.slice(conversation.messages.length - 20);
                    }

                    const historyArray = conversation.messages.map(m => ({ role: m.role, content: m.content }));

                    const aiReply = await generateAIResponse(msg.incomingText, finalDynamicPrompt, historyArray, activeApiKey);
                    
                    let finalMessageToSend = aiReply;

                    // ==========================================
                    // BULLETPROOF JSON PARSING (REGEX FIXED)
                    // ==========================================
                    if (aiReply.includes('"trigger_order": true') || aiReply.includes('{')) {
                        try {
                            const jsonStart = aiReply.indexOf('{');
                            const jsonEnd = aiReply.lastIndexOf('}');
                            
                            if (jsonStart !== -1 && jsonEnd !== -1) {
                                const jsonString = aiReply.substring(jsonStart, jsonEnd + 1);
                                const orderData = JSON.parse(jsonString);
                                
                                if (orderData.trigger_order) {
                                    await Order.create({
                                        user: config.user,
                                        customerName: orderData.customer_name,
                                        customerPhone: orderData.customer_phone,
                                        customerAddress: orderData.customer_address,
                                        productName: orderData.order_items,
                                        totalAmount: orderData.total_amount || 0,
                                        status: 'Pending'
                                    });
                                    
                                    // 💥 THE MAGIC FIX: Backticks replaced with [`]{3}
                                    finalMessageToSend = aiReply.replace(jsonString, '').replace(/[`]{3}json|[`]{3}/g, '').trim();
                                    
                                    if (!finalMessageToSend || finalMessageToSend === '') {
                                        finalMessageToSend = "আপনার অর্ডারটি সফলভাবে প্রসেস করা হচ্ছে... খুব শিঘ্রই আমরা যোগাযোগ করবো! 😊";
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Order Parsing Error:", e);
                        }
                    }

                    if (finalMessageToSend) {
                        conversation.messages.push({ role: 'assistant', content: finalMessageToSend });
                        await conversation.save();
                    }

                    await sendFacebookMessage(msg.senderPsid, finalMessageToSend, config.integrations.facebook.accessToken);
                    await PendingMessage.findByIdAndDelete(msg._id);

                } catch (err) {
                    console.error(`❌ Thread failed for msg ${msg._id}:`, err);
                    await PendingMessage.findByIdAndUpdate(msg._id, { status: 'pending' }).catch(e => console.error("Revert error:", e));
                }
            }));
        }

        res.status(200).json({ success: true, message: `Processed ${messagesToProcess.length} messages smoothly.` });
    } catch (error) {
        console.error("❌ Extreme Scale Cron Error:", error);
        res.status(500).json({ success: false, error: "Failed to execute cron tasks." });
    }
};