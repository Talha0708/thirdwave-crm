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

export const addClient = async (req, res) => {
    try {
        const { name, email, password, company, plan, mrr, status } = req.body;
        
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: 'Email already exists' });

        const user = await User.create({ 
            name, email, password, company, role: 'user', 
            plan: plan || 'Basic', 
            mrr: mrr || 0, 
            status: status || 'Active' 
        });

        res.status(201).json({ success: true, message: 'Client added successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const getAllClients = async (req, res) => {
    try {
        const clients = await User.find({ role: 'user' })
                                  .select('-password')
                                  .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: clients.length, data: clients });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ─── NEW: ক্লায়েন্ট এডিট/সাসপেন্ড করার ফাংশন ───
export const updateClient = async (req, res) => {
    try {
        const { plan, mrr, status } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // নতুন ডেটা দিয়ে আপডেট করা
        user.plan = plan || user.plan;
        user.mrr = mrr || user.mrr;
        user.status = status || user.status;

        const updatedUser = await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'Client updated successfully', 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Client Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};