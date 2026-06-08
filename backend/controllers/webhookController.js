import AiConfig from '../models/AiConfig.js';
import Order from '../models/Order.js'; 
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
                                    console.log(`⏳ THROTTLE: RPM Limit Exceeded for Page: ${pageId}`);
                                    return; 
                                }

                                sub.monthlyUsed += 1;
                                sub.rpmUsed += 1;
                                sub.lastMessageTimestamp = now;
                                await config.save(); 

                                console.log(`📈 Usage Update: Monthly (${sub.monthlyUsed}/${sub.monthlyLimit}) | RPM (${sub.rpmUsed}/${sub.rpmLimit})`);
                                console.log("🧠 AI is thinking...");
                                
                                const aiReply = await generateAIResponse(incomingText, config.systemPrompt, []);
                                console.log(`🤖 AI Reply Generated!`);

                                // 💥💥 ORDER PARSING ENGINE 💥💥
                                let finalMessageToSend = aiReply;

                                if (aiReply.includes('"trigger_order": true')) {
                                    try {
                                        console.log("🛒 Order trigger detected in AI response!");
                                        
                                        const jsonMatch = aiReply.match(/\{[\s\S]*?\}/);
                                        
                                        if (jsonMatch) {
                                            const orderData = JSON.parse(jsonMatch[0]);
                                            
                                            // 💥 একদম তোর Order স্কিমার সাথে মিলিয়ে ডেটা পুশ করা হলো
                                            await Order.create({
                                                user: config.user,
                                                customerName: orderData.customer_name,
                                                customerPhone: orderData.customer_phone,
                                                customerAddress: orderData.customer_address,
                                                productName: orderData.order_items,
                                                totalAmount: orderData.total_amount || 0,
                                                status: 'Pending'
                                            });
                                            
                                            console.log("✅ Order successfully captured and saved to Database!");
                                            
                                            finalMessageToSend = aiReply.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*?\}/g, '').trim();
                                        }
                                    } catch (parseError) {
                                        console.error("❌ Failed to parse or save order JSON:", parseError);
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

export const processMessageQueue = async (req, res) => {
    try {
        console.log("Cron job triggered: Processing message queue...");
        res.status(200).json({ success: true, message: "Queue processed successfully" });
    } catch (error) {
        console.error("Queue Processing Error:", error);
        res.status(500).json({ success: false, error: "Failed to process queue" });
    }
};