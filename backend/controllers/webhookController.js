import AiConfig from '../models/AiConfig.js';
import Order from '../models/Order.js'; 
import Product from '../models/Product.js'; 
import PendingMessage from '../models/PendingMessage.js'; 
import { generateAIResponse } from '../services/aiService.js';
import { sendFacebookMessage } from '../services/facebookService.js';
// 💥 NEW: WhatsApp Service ইমপোর্ট করা হলো (আমরা নেক্সট ধাপে এই ফাইলটা বানাব)
import { sendWhatsAppMessage } from '../services/whatsappService.js';

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
        const queuePromises = [];

        // 🔵 ১. FACEBOOK MESSENGER LOGIC
        if (body.object === 'page') {
            body.entry.forEach((entry) => {
                const pageId = entry.id;
                
                entry.messaging.forEach((webhook_event) => {
                    if (webhook_event.message && webhook_event.message.text && !webhook_event.message.is_echo) {
                        const senderPsid = webhook_event.sender.id;
                        const incomingText = webhook_event.message.text;
                        
                        console.log(`🔵 [FB QUEUE PUSH] Page: ${pageId} | User: ${senderPsid}`);

                        queuePromises.push(
                            PendingMessage.create({
                                pageId: String(pageId),
                                senderPsid: String(senderPsid),
                                incomingText: incomingText,
                                status: 'pending',
                                platform: 'facebook' // প্ল্যাটফর্ম ট্যাগ
                            })
                        );
                    }
                });
            });

            await Promise.all(queuePromises);
            res.status(200).send('EVENT_RECEIVED');
        } 
        
        // 🟢 ২. WHATSAPP CLOUD API LOGIC
        else if (body.object === 'whatsapp_business_account') {
            body.entry.forEach((entry) => {
                entry.changes.forEach((change) => {
                    if (change.value && change.value.messages) {
                        change.value.messages.forEach((message) => {
                            if (message.type === 'text') {
                                const senderPhone = message.from; 
                                const incomingText = message.text.body;
                                const phoneId = change.value.metadata.phone_number_id; 

                                console.log(`🟢 [WA QUEUE PUSH] PhoneID: ${phoneId} | User: ${senderPhone}`);

                                queuePromises.push(
                                    PendingMessage.create({
                                        pageId: String(phoneId),
                                        senderPsid: String(senderPhone),
                                        incomingText: incomingText,
                                        status: 'pending',
                                        platform: 'whatsapp' // প্ল্যাটফর্ম ট্যাগ
                                    })
                                );
                            }
                        });
                    }
                });
            });

            await Promise.all(queuePromises);
            res.status(200).send('EVENT_RECEIVED');
        } 
        
        else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Critical Error:", error);
        res.status(500).send('Server Error');
    }
};

const chunkArray = (array, size) => {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
        array.slice(i * size, i * size + size)
    );
};

export const processMessageQueue = async (req, res) => {
    try {
        console.log("⏰ [CRON HIT]: Executing Enterprise Queue Processor...");

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

        const uniquePageIds = [...new Set(lockedMessages.map(m => m.pageId))];

        // 💥 FIX: Facebook এবং WhatsApp দুইটারই Config খোঁজার লজিক
        const configs = await AiConfig.find({
            $or: [
                { "integrations.facebook.pageId": { $in: uniquePageIds } },
                { "integrations.whatsapp.phoneId": { $in: uniquePageIds } }
            ]
        });

        const configMap = {};
        const uniqueUserIds = [];
        configs.forEach(cfg => {
            // ফেসবুক বা হোয়াটসঅ্যাপ যেটার আইডি দিয়ে আসুক, সেটা ম্যাপে সেভ করবে
            if (cfg.integrations?.facebook?.pageId) configMap[cfg.integrations.facebook.pageId] = cfg;
            if (cfg.integrations?.whatsapp?.phoneId) configMap[cfg.integrations.whatsapp.phoneId] = cfg;
            
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

                    const aiReply = await generateAIResponse(msg.incomingText, finalDynamicPrompt, []);
                    
                    let finalMessageToSend = aiReply;

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
                                    finalMessageToSend = aiReply.replace(jsonString, '').replace(/```json|```/g, '').trim();
                                }
                            }
                        } catch (e) {
                            console.error("Order Parsing Error:", e);
                        }
                    }

                    // 💥 FIX: Platform চেক করে সঠিক জায়গায় মেসেজ পাঠানো
                    if (msg.platform === 'whatsapp') {
                        // হোয়াটসঅ্যাপের ক্ষেত্রে ফোন আইডি এবং এক্সেস টোকেন লাগবে
                        const waToken = config.integrations?.whatsapp?.accessToken || process.env.WHATSAPP_TOKEN;
                        await sendWhatsAppMessage(msg.senderPsid, finalMessageToSend, waToken, msg.pageId);
                    } else {
                        // ফেসবুকের ক্ষেত্রে
                        await sendFacebookMessage(msg.senderPsid, finalMessageToSend, config.integrations.facebook.accessToken);
                    }

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