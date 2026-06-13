import AiConfig from '../models/AiConfig.js';
import Order from '../models/Order.js'; 
import Product from '../models/Product.js'; 
import PendingMessage from '../models/PendingMessage.js'; 
import Conversation from '../models/Conversation.js'; // 💥 NEW: History Model Import করা হলো
import { generateAIResponse } from '../services/aiService.js';
import { sendFacebookMessage } from '../services/facebookService.js';

// 💥 FIX 6: Security - No hardcoded fallback token
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

// 💥 Helper Function: Array Chunking for Concurrency Limit
const chunkArray = (array, size) => {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
        array.slice(i * size, i * size + size)
    );
};

export const processMessageQueue = async (req, res) => {
    try {
        console.log("⏰ [CRON HIT]: Executing Enterprise Queue Processor...");

        // ==========================================
        // 💥 FIX 1: ATOMIC LOCK (Zero Race Condition)
        // ==========================================
        const lockedMessages = [];
        const BATCH_SIZE = 50;

        // findOneAndUpdate দিয়ে একটা একটা করে লক করছি, যেন অন্য ক্রন জব ওভারল্যাপ না করে
        for (let i = 0; i < BATCH_SIZE; i++) {
            const lockedMsg = await PendingMessage.findOneAndUpdate(
                { status: 'pending' },
                { $set: { status: 'processing' } },
                { sort: { createdAt: 1 }, new: true }
            );
            if (!lockedMsg) break; // আর কোনো পেন্ডিং মেসেজ নেই
            lockedMessages.push(lockedMsg);
        }

        if (lockedMessages.length === 0) {
            return res.status(200).json({ success: true, message: "No pending messages." });
        }

        // ==========================================
        // BATCH DB LOAD (Config & Product) - OK
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
        // 💥 FIX 2: IN-MEMORY RPM (Fixed Minute Window)
        // ==========================================
        const messagesToProcess = [];
        const configUpdates = new Map();
        
        const now = new Date();
        const currentMinute = new Date(now).setSeconds(0, 0); // বর্তমান মিনিটের শুরু

        for (let msg of lockedMessages) {
            let config = configUpdates.get(msg.pageId) || configMap[msg.pageId];

            if (!config || !config.autoReply) {
                // 💥 FIX 4: Catch errors on fire-and-forget deletes
                PendingMessage.findByIdAndDelete(msg._id).catch(err => console.error("Zombie delete error:", err));
                continue;
            }

            const sub = config.subscription;

            if (sub.expiryDate && new Date(sub.expiryDate) < now) {
                PendingMessage.findByIdAndUpdate(msg._id, { status: 'pending' }).catch(err => console.error("Unlock error:", err));
                continue;
            }

            // Fixed Window Reset: লাস্ট মেসেজ যদি এই মিনিটের আগে হয়, তাহলে RPM জিরো করো
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
        // 💥 FIX 5: CONCURRENCY LIMIT (Chunking) & HISTORY
        // ==========================================
        console.log(`🚀 Dispatching ${messagesToProcess.length} messages (Max 10 per batch)...`);
        
        const CONCURRENCY_LIMIT = 10;
        const chunks = chunkArray(messagesToProcess, CONCURRENCY_LIMIT);

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async ({ msg, config }) => {
                try {
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
                    // 💥 NEW: CHAT HISTORY (MEMORY) LOGIC
                    // ==========================================
                    let conversation = await Conversation.findOne({ senderId: msg.senderPsid, pageId: msg.pageId });
                    
                    if (!conversation) {
                        conversation = new Conversation({
                            senderId: msg.senderPsid,
                            pageId: msg.pageId,
                            messages: []
                        });
                    }

                    // কাস্টমারের বর্তমান মেসেজটা পুশ করা হলো
                    conversation.messages.push({ role: 'user', content: msg.incomingText });

                    // মেমোরি অপটিমাইজেশন: লাস্ট ২০টা মেসেজ রাখা হলো
                    if (conversation.messages.length > 20) {
                        conversation.messages = conversation.messages.slice(conversation.messages.length - 20);
                    }

                    // ডাটাবেসের মেসেজগুলোকে AI সার্ভিসের ফরমেটে ম্যাপ করা
                    const historyArray = conversation.messages.map(m => ({ role: m.role, content: m.content }));

                    // এআই কল (History সহ)
                    const aiReply = await generateAIResponse(msg.incomingText, finalDynamicPrompt, historyArray);
                    
                    let finalMessageToSend = aiReply;

                    // ==========================================
                    // 💥 FIX 3: BULLETPROOF JSON PARSING
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
                                    // Remove JSON from the reply string to send only the text to the user
                                    finalMessageToSend = aiReply.replace(jsonString, '').replace(/```json|```/g, '').trim();
                                }
                            }
                        } catch (e) {
                            console.error("Order Parsing Error:", e);
                        }
                    }

                    // 💥 NEW: এআই এর রিপ্লাইটাও ডাটাবেসে সেভ করা (JSON ছাড়া ফ্রেশ টেক্সটটা)
                    if (finalMessageToSend) {
                        conversation.messages.push({ role: 'assistant', content: finalMessageToSend });
                        await conversation.save();
                    }

                    await sendFacebookMessage(msg.senderPsid, finalMessageToSend, config.integrations.facebook.accessToken);

                    // 💥 FIX 4: Await the delete to avoid zombie messages
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