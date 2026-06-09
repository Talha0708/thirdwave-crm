import AiConfig from '../models/AiConfig.js';
import Order from '../models/Order.js'; 
import Product from '../models/Product.js'; 
import PendingMessage from '../models/PendingMessage.js'; 
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

// 💥 ১. WEBHOOK RECEIVER: শুধু মেসেজ রিসিভ করে Queue-তে ঢোকাবে (No Direct Reply)
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
                        
                        console.log(`📩 [INCOMING] Message pushed to Queue - Page: ${pageId} | User: ${senderPsid}`);

                        // মেসেজ সোজা ডাটাবেস লাইনে (Queue) চলে যাবে
                        const addToQueue = PendingMessage.create({
                            pageId: String(pageId),
                            senderPsid: String(senderPsid),
                            incomingText: incomingText,
                            status: 'pending'
                        });
                        
                        queuePromises.push(addToQueue);
                    }
                });
            });

            await Promise.all(queuePromises);
            res.status(200).send('EVENT_RECEIVED'); // ফেসবুককে সাথে সাথে OK বলে দেওয়া
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Critical Error:", error);
        res.status(500).send('Server Error');
    }
};

// 💥 ২. CRON JOB PROCESSOR: লাইন থেকে ডাইনামিক লিমিট অনুযায়ী মেসেজ প্রসেস করবে
export const processMessageQueue = async (req, res) => {
    try {
        console.log("⏰ [CRON HIT]: Checking for pending messages strictly by serial...");

        // FIFO: সবচেয়ে পুরনো ৫০টা মেসেজ ডাটাবেস থেকে টানবে
        const pendingMessages = await PendingMessage.find({ status: 'pending' })
            .sort({ createdAt: 1 })
            .limit(50);

        if (pendingMessages.length === 0) {
            return res.status(200).json({ success: true, message: "No pending messages." });
        }

        let processedCount = 0;

        for (let msg of pendingMessages) {
            try {
                // পেজের কনফিগ তুলে আনছি
                const config = await AiConfig.findOne({ 
                    "integrations.facebook.pageId": msg.pageId,
                    "integrations.facebook.isConnected": true 
                });

                // কনফিগ না থাকলে বা অটো-রিপ্লাই অফ থাকলে কিউ থেকে ডিলিট
                if (!config || !config.autoReply) {
                    await PendingMessage.findByIdAndDelete(msg._id); 
                    continue;
                }

                const now = new Date();
                const sub = config.subscription;

                // 💥 ম্যাজিক: লাস্ট মেসেজের পর ১ মিনিট পার হলে লিমিট জিরো (0) করো
                const timeSinceLastMessage = now.getTime() - new Date(sub.lastMessageTimestamp).getTime();
                if (timeSinceLastMessage > 60000) {
                    sub.rpmUsed = 0; 
                }

                // 💥 লিমিট চেক: ইউজারের প্ল্যান অনুযায়ী (৩, ৭, ১২ RPM) চেক করবে
                if (sub.rpmUsed >= sub.rpmLimit) {
                    // লিমিট শেষ হলে মেসেজ স্কিপ করে লাইনেই রেখে দেবে
                    continue; 
                }

                // লিমিট আছে, তাই কাজ শুরু! স্ট্যাটাস লক করলাম ডাবল প্রসেসিং এড়াতে
                msg.status = 'processing';
                await msg.save();

                // লিমিট ১ বাড়িয়ে দিলাম
                sub.rpmUsed += 1;
                sub.monthlyUsed += 1;
                sub.lastMessageTimestamp = now;
                await config.save();

                // --- CATALOG INJECTION ENGINE ---
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

                console.log(`🧠 AI processing message for user: ${msg.senderPsid} (RPM Used: ${sub.rpmUsed}/${sub.rpmLimit})`);
                
                // এআই রেসপন্স জেনারেট
                const aiReply = await generateAIResponse(msg.incomingText, finalDynamicPrompt, []);
                
                // --- ORDER PARSING ENGINE ---
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
                            console.log("✅ Order successfully captured!");
                            finalMessageToSend = aiReply.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*?\}/g, '').trim();
                        }
                    } catch (e) {
                        console.error("Queue Parse Error:", e);
                    }
                }

                // ফেসবুকে মেসেজ সেন্ড করা
                await sendFacebookMessage(msg.senderPsid, finalMessageToSend, config.integrations.facebook.accessToken);

                // কাজ শেষ, ডাটাবেসের লাইন থেকে মেসেজ মুছে ফেলা
                await PendingMessage.findByIdAndDelete(msg._id);
                processedCount++;

            } catch (innerError) {
                console.error(`❌ Failed to process message ${msg._id}:`, innerError);
                // কোনো কারণে এরর খেলে আবার লাইনে দাঁড় করিয়ে দেওয়া
                await PendingMessage.findByIdAndUpdate(msg._id, { status: 'pending' });
            }
        }

        res.status(200).json({ success: true, message: `Processed ${processedCount} queued messages successfully.` });
    } catch (error) {
        console.error("❌ Cron Processing Error:", error);
        res.status(500).json({ success: false, error: "Failed to execute cron tasks." });
    }
};