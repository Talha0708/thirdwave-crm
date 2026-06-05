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
            const processPromises = []; // 💥 NEW: সব কাজ একসাথে করার জন্য Array

            body.entry.forEach((entry) => {
                const pageId = entry.id;
                
                entry.messaging.forEach((webhook_event) => {
                    if (webhook_event.message && webhook_event.message.text && !webhook_event.message.is_echo) {
                        const senderPsid = webhook_event.sender.id;
                        const incomingText = webhook_event.message.text;
                        
                        console.log(`\n📩 [NEW MESSAGE] Page: ${pageId} | User: ${senderPsid} | Text: "${incomingText}"`);

                        // 💥 NEW: Promise তৈরি করে Array-তে রাখা (Vercel যেন ওয়েট করে)
                        const processTask = async () => {
                            try {
                                const config = await AiConfig.findOne({ 
                                    "integrations.facebook.pageId": pageId,
                                    "integrations.facebook.isConnected": true 
                                });

                                if (!config) return;

                                if (config.autoReply) {
                                    console.log("🧠 AI is thinking...");
                                    // AI ব্রেইনের কাছে মেসেজ পাঠানো
                                    const aiReply = await generateAIResponse(incomingText, config.systemPrompt, []);
                                    console.log(`🤖 AI Generated Reply: "${aiReply}"`);
                                    
                                    // কাস্টমারকে মেসেজ পাঠানো
                                    await sendFacebookMessage(senderPsid, aiReply, config.integrations.facebook.accessToken);
                                }
                            } catch (err) {
                                console.error("❌ Pipeline Error:", err);
                            }
                        };
                        
                        processPromises.push(processTask());
                    }
                });
            });

            // 💥 MASTERSTROKE: Vercel-কে ওয়েট করানো হচ্ছে সব AI কাজ শেষ হওয়া পর্যন্ত
            await Promise.all(processPromises);

            // কাজ শেষ হলে তারপর Facebook-কে 200 OK পাঠানো
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Critical Error:", error);
        res.status(500).send('Server Error');
    }
};