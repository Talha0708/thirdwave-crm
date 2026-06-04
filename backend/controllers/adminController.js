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
            stats: { totalClients, totalAdmins, activeProjects: 0, revenue: 0 },
            recentUsers
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ─── NEW: অ্যাডমিন প্যানেল থেকে ক্লায়েন্ট অ্যাড করার ফাংশন ───
export const addClient = async (req, res) => {
    try {
        const { name, email, password, company } = req.body;
        
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: 'Email already exists' });

        const user = await User.create({ name, email, password, company, role: 'user' });

        res.status(201).json({
            success: true,
            message: 'Client added successfully',
            user: { _id: user._id, name: user.name, email: user.email, company: user.company, role: user.role, createdAt: user.createdAt }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};