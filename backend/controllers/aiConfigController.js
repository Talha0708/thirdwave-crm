import AiConfig from '../models/AiConfig.js';
import axios from 'axios'; // 💥 নতুন অ্যাড করা হলো

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
        // platform = 'facebook' বা 'whatsapp'
        // data = { isConnected, connectionMethod, pageId, accessToken, etc. }

        if (!['facebook', 'whatsapp'].includes(platform)) {
            return res.status(400).json({ success: false, error: "Invalid platform" });
        }

        // ডায়নামিক ফিল্ড আপডেট করা (যেমন: integrations.facebook)
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

// ৪. 💥 Facebook OAuth Token Exchange (অটো লগইনের আসল ম্যাজিক)
export const exchangeFacebookToken = async (req, res) => {
    try {
        const { shortLivedToken } = req.body;
        const userId = req.user._id; 
        const APP_ID = process.env.FACEBOOK_APP_ID;
        const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

        // ১. Short-lived টোকেন দিয়ে Long-lived User টোকেন আনা
        const userTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
        const userTokenRes = await axios.get(userTokenUrl);
        const longLivedUserToken = userTokenRes.data.access_token;

        // ২. ইউজারের সাথে কানেক্টেড ফেসবুক পেজগুলো খুঁজে বের করা
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`;
        const pagesRes = await axios.get(pagesUrl);
        
        if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
            return res.status(400).json({ success: false, message: "No Facebook Pages found for this account." });
        }

        // ৩. প্রথম পেজটা সিলেক্ট করা
        const page = pagesRes.data.data[0]; 
        const permanentPageToken = page.access_token; 
        const pageId = page.id;
        const pageName = page.name;

        // ৪. ডেটাবেসে (AiConfig) সেভ করা
        let config = await AiConfig.findOne({ user: userId });
        if (!config) {
            config = new AiConfig({ user: userId });
        }

        config.integrations.facebook = {
            isConnected: true,
            connectionMethod: 'oauth',
            pageId: pageId,
            pageName: pageName,
            accessToken: permanentPageToken
        };

        await config.save();

        res.status(200).json({ 
            success: true, 
            message: "Facebook connected successfully!",
            data: config.integrations.facebook 
        });

    } catch (error) {
        console.error("Facebook Token Exchange Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: "Failed to verify Facebook login." });
    }
};