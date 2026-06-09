import AiConfig from '../models/AiConfig.js';
import Order from '../models/Order.js'; 
import Product from '../models/Product.js'; 
import PendingMessage from '../models/PendingMessage.js'; // 💥 তোর বানানো Queue মডেল ইমপোর্ট করা হলো
import { generateAIResponse } from '../services/aiService.js';
import { sendFacebookMessage } from '../services/facebookService.js';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "thirdwave_secure_token_2026";

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
            const processPromises = [];

            body.entry.forEach((entry) => {
                const pageId = entry.id;
                
                entry.messaging.forEach((webhook_event) => {
                    if (webhook_event.message && webhook_event.message.text && !webhook_event.message.is_echo) {
                        const senderPsid = webhook_event.sender.id;
                        const incomingText = webhook_event.message.text;
                        
                        console.log(`\n📩 [NEW MESSAGE] Page: ${pageId} | User: ${senderPsid}`);

                        const processTask = async () => {
                            try {
                                const config = await AiConfig.findOne({ 
                                    "integrations.facebook.pageId": String(pageId),
                                    "integrations.facebook.isConnected": true 
                                });

                                if (!config || !config.autoReply) {
                                    console.log(`⚠️ STOPPED: Config missing or Auto-reply OFF for Page ID: ${pageId}`);
                                    return;
                                }

                                // 💥 RATE LIMITING ENGINE 💥
                                const now = new Date();
                                const sub = config.subscription;

                                if (sub.expiryDate && new Date(sub.expiryDate) < now) {
                                    console.log(`❌ BLOCK: Subscription Expired for Page: ${pageId}`);
                                    return;
                                }

                                if (sub.monthlyUsed >= sub.monthlyLimit) {
                                    console.log(`❌ BLOCK: Monthly Limit Reached for Page: ${pageId}`);
                                    return;
                                }

                                const timeSinceLastMessage = now.getTime() - new Date(sub.lastMessageTimestamp).getTime();
                                
                                if (timeSinceLastMessage > 60000) {
                                    sub.rpmUsed = 0;
                                } else if (sub.rpmUsed >= sub.rpmLimit) {
                                    // 💥💥 QUEUE ENGINE: লিমিট ক্রস করলে মেসেজ ড্রপ না করে ডেটাবেসে সেভ করা হচ্ছে
                                    console.log(`⏳ THROTTLE: RPM Limit Exceeded! Sending message to Queue...`);
                                    await PendingMessage.create({
                                        pageId: String(pageId),
                                        senderPsid: String(senderPsid),
                                        incomingText: incomingText
                                    });
                                    return; 
                                }

                                sub.monthlyUsed += 1;
                                sub.rpmUsed += 1;
                                sub.lastMessageTimestamp = now;
                                await config.save(); 

                                console.log(`📈 Usage Update: Monthly (${sub.monthlyUsed}/${sub.monthlyLimit}) | RPM (${sub.rpmUsed}/${sub.rpmLimit})`);
                                console.log("🧠 AI is thinking...");

                                // 💥 CATALOG INJECTION ENGINE
                                const activeProducts = await Product.find({ 
                                    user: config.user, 
                                    status: 'Active' 
                                });

                                let catalogContext = "\n\n--- INVENTORY DATA ---\nHere are the ONLY products currently available in stock:\n";
                                if (activeProducts.length > 0) {
                                    activeProducts.forEach(p => {
                                        catalogContext += `- ${p.name} (Category: ${p.category}, Price: ৳${p.price}, Sizes: ${p.sizes.join(', ')})\n`;
                                    });
                                } else {
                                    catalogContext += "Currently, no products are available in stock.\n";
                                }
                                catalogContext += "Do not offer any products or sizes that are not listed above.\n----------------------";

                                const finalDynamicPrompt = config.systemPrompt + catalogContext;

                                const aiReply = await generateAIResponse(incomingText, finalDynamicPrompt, []);
                                console.log(`🤖 AI Reply Generated!`);
                                
                                // 💥 ORDER PARSING ENGINE
                                let finalMessageToSend = aiReply;

                                if (aiReply.includes('"trigger_order": true')) {
                                    try {
                                        console.log("🛒 Order trigger detected in AI response!");
                                        const jsonMatch = aiReply.match(/\{[\s\S]*?\}/);
                                        
                                        if (jsonMatch) {
                                            const orderData = JSON.parse(jsonMatch[0]);
                                            await Order.create({
                                                user: config.user,
                                                customerName: orderData.customer_name,
                                                customerPhone: orderData.customer_phone,
                                                customerAddress: orderData.customer_address,
                                                productName: orderData.order_items,
                                                totalAmount: orderData.total_amount || 0,
                                                status: 'Pending'
                                            });
                                            console.log("✅ Order successfully captured!");
                                            finalMessageToSend = aiReply.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*?\}/g, '').trim();
                                        }
                                    } catch (parseError) {
                                        console.error("❌ Failed to parse order JSON:", parseError);
                                    }
                                }
                                
                                await sendFacebookMessage(senderPsid, finalMessageToSend, config.integrations.facebook.accessToken);
                                
                            } catch (err) {
                                console.error("❌ Pipeline Error:", err);
                            }
                        };
                        
                        processPromises.push(processTask());
                    }
                });
            });

            await Promise.all(processPromises);
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Critical Error:", error);
        res.status(500).send('Server Error');
    }
};

// 💥💥 THE CRON JOB PROCESSOR (Fully Functional!) 💥💥
export const processMessageQueue = async (req, res) => {
    try {
        console.log("⏰ [CRON HIT]: Checking for pending messages...");

        // ১. ফার্স্ট ইন ফার্স্ট আউট (FIFO) পদ্ধতিতে ২০টা মেসেজ নিয়ে আসা
        const pendingMessages = await PendingMessage.find({ status: 'pending' })
            .sort({ createdAt: 1 })
            .limit(20);

        if (pendingMessages.length === 0) {
            return res.status(200).json({ success: true, message: "No pending messages." });
        }

        console.log(`🚀 Processing ${pendingMessages.length} queued messages...`);

        // ২. ডাবল প্রসেসিং এড়ানোর জন্য এদের স্ট্যাটাস 'processing' করে দেওয়া
        const messageIds = pendingMessages.map(msg => msg._id);
        await PendingMessage.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status: 'processing' } }
        );

        // ৩. লুপ চালিয়ে প্রতিটি মেসেজ প্রসেস করা
        for (let msg of pendingMessages) {
            try {
                const config = await AiConfig.findOne({ 
                    "integrations.facebook.pageId": msg.pageId,
                    "integrations.facebook.isConnected": true 
                });

                if (!config || !config.autoReply) {
                    await PendingMessage.findByIdAndDelete(msg._id); // কনফিগ না থাকলে ডিলিট
                    continue;
                }

                // কিউ এর মেসেজের জন্যও ক্যাটালগ ফেচ করা
                const activeProducts = await Product.find({ user: config.user, status: 'Active' });
                let catalogContext = "\n\n--- INVENTORY DATA ---\nHere are the ONLY products currently available in stock:\n";
                if (activeProducts.length > 0) {
                    activeProducts.forEach(p => {
                        catalogContext += `- ${p.name} (Category: ${p.category}, Price: ৳${p.price}, Sizes: ${p.sizes.join(', ')})\n`;
                    });
                } else {
                    catalogContext += "Currently, no products are available in stock.\n";
                }
                catalogContext += "Do not offer any products or sizes that are not listed above.\n----------------------";

                const finalDynamicPrompt = config.systemPrompt + catalogContext;

                // এআই রেসপন্স জেনারেট
                const aiReply = await generateAIResponse(msg.incomingText, finalDynamicPrompt, []);
                
                // অর্ডার হ্যান্ডলিং
                let finalMessageToSend = aiReply;
                if (aiReply.includes('"trigger_order": true')) {
                    try {
                        const jsonMatch = aiReply.match(/\{[\s\S]*?\}/);
                        if (jsonMatch) {
                            const orderData = JSON.parse(jsonMatch[0]);
                            await Order.create({
                                user: config.user,
                                customerName: orderData.customer_name,
                                customerPhone: orderData.customer_phone,
                                customerAddress: orderData.customer_address,
                                productName: orderData.order_items,
                                totalAmount: orderData.total_amount || 0,
                                status: 'Pending'
                            });
                            finalMessageToSend = aiReply.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*?\}/g, '').trim();
                        }
                    } catch (e) {
                        console.error("Queue Parse Error:", e);
                    }
                }

                // ফেসবুকে সেন্ড করা
                await sendFacebookMessage(msg.senderPsid, finalMessageToSend, config.integrations.facebook.accessToken);

                // ৪. কাজ শেষ, কিউ থেকে ডিলিট করে দেওয়া
                await PendingMessage.findByIdAndDelete(msg._id);
                console.log(`✅ Message processed and removed from queue.`);

            } catch (innerError) {
                console.error(`❌ Failed to process message ${msg._id}:`, innerError);
                // কোনো কারণে ফেইল করলে আবার 'pending' করে দেওয়া, যাতে পরের ক্রনে ট্রাই মারে
                await PendingMessage.findByIdAndUpdate(msg._id, { status: 'pending' });
            }
        }

        res.status(200).json({ success: true, message: `Processed ${pendingMessages.length} queued messages.` });
    } catch (error) {
        console.error("❌ Cron Processing Error:", error);
        res.status(500).json({ success: false, error: "Failed to execute cron tasks." });
    }
};