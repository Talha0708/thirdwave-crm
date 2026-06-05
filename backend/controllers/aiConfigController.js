import AiConfig from '../models/AiConfig.js';

// ১. ডেটাবেস থেকে কনফিগ আনা
export const getAiConfig = async (req, res) => {
    try {
        let config = await AiConfig.findOne({ user: req.user._id });
        
        // যদি আগে থেকে কনফিগ না থাকে, তাহলে ডিফল্ট একটা বানিয়ে নেব
        if (!config) {
            config = await AiConfig.create({ user: req.user._id });
        }
        
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ২. কনফিগ সেভ/আপডেট করা
export const updateAiConfig = async (req, res) => {
    try {
        const config = await AiConfig.findOneAndUpdate(
            { user: req.user._id },
            { $set: req.body },
            { new: true, upsert: true } // upsert: true মানে হলো না থাকলে নতুন বানাবে, থাকলে আপডেট করবে
        );
        
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};