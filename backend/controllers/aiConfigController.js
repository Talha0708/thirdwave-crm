import AiConfig from '../models/AiConfig.js';
import axios from 'axios';

// ১. ডেটাবেস থেকে কনফিগ আনা
export const getAiConfig = async (req, res) => {
    try {
        let config = await AiConfig.findOne({ user: req.user._id });
        
        // যদি আগে থেকে কনফিগ না থাকে, তাহলে ডিফল্ট একটা বানিয়ে নেব
        if (!config) {
            config = await AiConfig.create({ user: req.user._id });
        }
        
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        console.error("Fetch Config Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ২. জেনারেল কনফিগ (System Prompt, Tone, Auto-reply) সেভ/আপডেট করা
export const updateAiConfig = async (req, res) => {
    try {
        const config = await AiConfig.findOneAndUpdate(
            { user: req.user._id },
            { $set: req.body },
            { new: true, upsert: true } // upsert: true মানে হলো না থাকলে নতুন বানাবে, থাকলে আপডেট করবে
        );
        
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        console.error("Update Config Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ৩. 💥 Enterprise Integration Controller (Facebook & WhatsApp Manual/OAuth)
export const updateIntegration = async (req, res) => {
    try {
        const { platform, data } = req.body; 
        if (!['facebook', 'whatsapp'].includes(platform)) {
            return res.status(400).json({ success: false, error: "Invalid platform" });
        }

        const updateField = {};
        updateField[`integrations.${platform}`] = data;

        const config = await AiConfig.findOneAndUpdate(
            { user: req.user._id },
            { $set: updateField },
            { new: true, upsert: true }
        );
        
        res.status(200).json({ 
            success: true, 
            message: `${platform.toUpperCase()} integration updated successfully!`, 
            data: config 
        });
    } catch (error) {
        console.error("Integration Update Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ৪. 💥 Facebook OAuth Token Exchange (NEW: Returns list of pages to frontend)
export const exchangeFacebookToken = async (req, res) => {
    try {
        const { shortLivedToken } = req.body;
        const APP_ID = process.env.FACEBOOK_APP_ID;
        const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

        // ১. Short-lived টোকেন দিয়ে Long-lived User টোকেন আনা
        const userTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
        const userTokenRes = await axios.get(userTokenUrl);
        const longLivedUserToken = userTokenRes.data.access_token;

        // ২. ইউজারের সাথে কানেক্টেড ফেসবুক পেজগুলো খুঁজে বের করা (💥 limit=100 অ্যাড করা হয়েছে)
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?limit=100&access_token=${longLivedUserToken}`;
        const pagesRes = await axios.get(pagesUrl);
        
        if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
            return res.status(400).json({ success: false, message: "No Facebook Pages found for this account." });
        }

        // ৩. ম্যাজিক: ডেটাবেসে সরাসরি সেভ না করে, পেজের লিস্ট ফ্রন্টএন্ডে পাঠানো হচ্ছে
        const pagesList = pagesRes.data.data.map(page => ({
            pageId: page.id,
            pageName: page.name,
            accessToken: page.access_token
        }));

        res.status(200).json({ 
            success: true, 
            message: "Pages fetched successfully!",
            pages: pagesList 
        });

    } catch (error) {
        console.error("Facebook Token Exchange Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: "Failed to verify Facebook login." });
    }
};