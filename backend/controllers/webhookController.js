// Meta Webhook Verification Token (পরে আমরা .env ফাইলে এটা দেব)
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "thirdwave_secure_token_2026";

// ১. Webhook Verify করা (Meta যখন প্রথমবার কানেক্ট করবে তখন এটা হিট করবে)
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED_SUCCESSFULLY');
            res.status(200).send(challenge);
        } else {
            console.error('❌ WEBHOOK_VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    } else {
        res.status(400).send("Bad Request: Missing parameters");
    }
};

// ২. Live Message রিসিভ করা (কাস্টমার যখন পেজে মেসেজ দেবে)
export const receiveMessage = async (req, res) => {
    try {
        const body = req.body;

        // চেক করা যে মেসেজটা ফেসবুক পেজ থেকেই এসেছে কি না
        if (body.object === 'page') {
            body.entry.forEach(function(entry) {
                // মেসেজের আসল ডেটা বের করা
                const webhook_event = entry.messaging[0];
                const sender_psid = webhook_event.sender.id; // কাস্টমারের ID
                
                if (webhook_event.message && webhook_event.message.text) {
                    const text = webhook_event.message.text;
                    console.log(`📩 New Message from [${sender_psid}]: ${text}`);
                    
                    // 💥 নেক্সট স্টেপে আমরা এখানে AI Engine কল করব!
                }
            });

            // মেটাকে 200 OK পাঠানো খুব জরুরি, নাহলে মেটা বারবার মেসেজ পাঠাতে থাকবে
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Server Error');
    }
};