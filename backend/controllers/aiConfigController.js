import AiConfig from '../models/AiConfig.js';

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