import AiConfig from '../models/AiConfig.js';
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

                                if (!config) {
                                    console.log(`⚠️ STOPPED: No config found for Page ID: ${pageId}`);
                                    return;
                                }

                                if (!config.autoReply) {
                                    console.log("⏸️ STOPPED: Auto-reply is OFF.");
                                    return;
                                }

                                // 💥 RATE LIMITING ENGINE 💥
                                const now = new Date();
                                const sub = config.subscription;

                                // ১. মান্থলি লিমিট চেক
                                if (sub.monthlyUsed >= sub.monthlyLimit) {
                                    console.log(`❌ BLOCK: Monthly Limit (${sub.monthlyLimit}) Reached for Page: ${pageId}`);
                                    // Optional: এখানে কাস্টমারকে একটা মেসেজ দেওয়া যায় যে "আমাদের সিস্টেম বিজি আছে, মানুষ রিপ্লাই দেবে।"
                                    return;
                                }

                                // ২. RPM (Requests Per Minute) চেক এবং রিসেট লজিক
                                const timeSinceLastMessage = now.getTime() - new Date(sub.lastMessageTimestamp).getTime();
                                
                                if (timeSinceLastMessage > 60000) {
                                    // যদি ১ মিনিট পার হয়ে যায়, তাহলে RPM কাউন্টার ০ করে দাও
                                    sub.rpmUsed = 0;
                                } else if (sub.rpmUsed >= sub.rpmLimit) {
                                    // যদি ১ মিনিটের ভেতরে লিমিট ক্রস করে
                                    console.log(`⏳ THROTTLE: RPM Limit (${sub.rpmLimit}/min) Exceeded for Page: ${pageId}`);
                                    return; 
                                }

                                // ৩. লিমিট ঠিক আছে! এবার কাউন্টার আপডেট করে ডেটাবেসে সেভ করো
                                sub.monthlyUsed += 1;
                                sub.rpmUsed += 1;
                                sub.lastMessageTimestamp = now;
                                await config.save(); // 💥 Database Updated!

                                console.log(`📈 Usage Update: Monthly (${sub.monthlyUsed}/${sub.monthlyLimit}) | RPM (${sub.rpmUsed}/${sub.rpmLimit})`);
                                console.log("🧠 AI is thinking...");
                                
                                const aiReply = await generateAIResponse(incomingText, config.systemPrompt, []);
                                console.log(`🤖 AI Reply Generated!`);
                                
                                await sendFacebookMessage(senderPsid, aiReply, config.integrations.facebook.accessToken);
                                
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