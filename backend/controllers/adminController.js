import User from '../models/User.js';

export const getDashboardStats = async (req, res) => {
    try {
        const totalClients = await User.countDocuments({ role: 'user' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        const recentUsers = await User.find({ role: 'user' })
                                      .select('-password')
                                      .sort({ createdAt: -1 })
                                      .limit(5);

        res.status(200).json({
            success: true,
            stats: {
                totalClients,
                totalAdmins,
                activeProjects: 0,
                revenue: 0
            },
            recentUsers
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};