export const sendWhatsAppMessage = async (to, messageText, token, phoneId) => {
    try {
        // Meta Graph API URL (v18.0 বা লেটেস্ট ভার্সন)
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

        // WhatsApp Cloud API-এর রিকোয়ারমেন্ট অনুযায়ী পেলোড
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: {
                preview_url: false,
                body: messageText
            }
        };

        // নেটিভ Fetch API দিয়ে রিকোয়েস্ট পাঠানো হচ্ছে
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // যদি মেটা সার্ভার থেকে কোনো এরর আসে
        if (!response.ok) {
            console.error("❌ WhatsApp API Error Details:", data);
            throw new Error(`WhatsApp API Error: ${data.error?.message || 'Unknown Error'}`);
        }

        console.log(`✅ [WA SENDER] Message sent successfully to ${to}`);
        return data;

    } catch (error) {
        console.error(`❌ [WA SENDER] Failed to send message to ${to}:`, error.message);
        throw error;
    }
};