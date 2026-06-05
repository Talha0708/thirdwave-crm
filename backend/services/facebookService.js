// এই ফাইলের কাজ হলো কাস্টমারের ইনবক্সে মেসেজ পাঠানো
export const sendFacebookMessage = async (senderId, messageText, pageAccessToken) => {
    try {
        // যদি টোকেন না থাকে, তবে আগেই এরর দেখিয়ে থেমে যাবে
        if (!pageAccessToken) {
            console.error("❌ Cannot send message: Page Access Token is missing!");
            return false;
        }

        // Facebook Graph API-এর মেসেজ পাঠানোর রুট
        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
        
        // কাস্টমারের ID এবং মেসেজের টেক্সট সাজানো
        const payload = {
            recipient: { id: senderId },
            message: { text: messageText },
            messaging_type: "RESPONSE"
        };

        // Facebook-এর সার্ভারে ডেটা পাঠানো
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // যদি ফেসবুক থেকে কোনো এরর আসে
        if (!response.ok) {
            console.error("❌ Facebook API Error:", data.error?.message || "Unknown error");
            return false;
        }

        console.log(`✅ Successfully sent AI reply to Facebook user [${senderId}]`);
        return true;

    } catch (error) {
        console.error("❌ Facebook Send Message Error:", error.message);
        return false;
    }
};