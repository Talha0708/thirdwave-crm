import AiConfig from '../models/AiConfig.js';
import { generateAIResponse } from '../services/aiService.js';
import { sendFacebookMessage } from '../services/facebookService.js';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "thirdwave_secure_token_2026";

// ১. Webhook Verify করা (Meta যখন কানেক্ট করবে)
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.status(400).send("Bad Request: Missing parameters");
    }
};

// ২. Live Message রিসিভ এবং AI দিয়ে অটো-রিপ্লাই করা
export const receiveMessage = async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'page') {
            // 💥 রুল ১: মেটাকে সাথে সাথে 200 OK পাঠিয়ে দেওয়া, যাতে ওরা বারবার রিকোয়েস্ট না পাঠায়
            res.status(200).send('EVENT_RECEIVED');

            // 💥 রুল ২: অ্যাসিনক্রোনাসভাবে মেসেজ প্রসেস করা
            body.entry.forEach(async (entry) => {
                const pageId = entry.id; // যে পেজে মেসেজ এসেছে তার ID
                
                entry.messaging.forEach(async (webhook_event) => {
                    const senderPsid = webhook_event.sender.id; // কাস্টমারের ID
                    
                    // শুধু কাস্টমারের আসল টেক্সট মেসেজ হলে কাজ করবে (পেজের নিজের মেসেজ বা ইকো ইগনোর করবে)
                    if (webhook_event.message && webhook_event.message.text && !webhook_event.message.is_echo) {
                        const incomingText = webhook_event.message.text;
                        console.log(`\n📩 [NEW MESSAGE] Page: ${pageId} | User: ${senderPsid} | Text: "${incomingText}"`);

                        try {
                            // ১. ডেটাবেস থেকে এই পেজ আইডি-র মালিকের কনফিগারেশন বের করা
                            const config = await AiConfig.findOne({ 
                                "integrations.facebook.pageId": pageId,
                                "integrations.facebook.isConnected": true 
                            });

                            if (!config) {
                                console.log(`⚠️ No active AI config found in DB for Page ID: ${pageId}`);
                                return;
                            }

                            // ২. যদি অটো-রিপ্লাই অন থাকে, তবেই AI কাজ করবে
                            if (config.autoReply) {
                                const accessToken = config.integrations.facebook.accessToken;
                                const systemPrompt = config.systemPrompt;
                                
                                console.log("🧠 AI is thinking...");
                                
                                // ৩. AI Service-কে কল করে রিপ্লাই বানানো (আপাতত products খালি রাখলাম)
                                const aiReply = await generateAIResponse(incomingText, systemPrompt, []);
                                
                                console.log(`🤖 AI Generated Reply: "${aiReply}"`);

                                // ৪. Facebook Service-কে কল করে মেসেজ সেন্ড করা
                                await sendFacebookMessage(senderPsid, aiReply, accessToken);
                            } else {
                                console.log("⏸️ Auto-reply is turned OFF for this page in AI Setup.");
                            }
                        } catch (err) {
                            console.error("❌ Error Processing AI Pipeline:", err);
                        }
                    }
                });
            });
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Critical Error:", error);
    }
};