import User from '../models/User.js';

export const getClientDashboardData = async (req, res) => {
    try {
        // protect মিডলওয়্যার থেকে লগইন করা ইউজারের ID পাব
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'Client data not found' });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Client Dashboard Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};