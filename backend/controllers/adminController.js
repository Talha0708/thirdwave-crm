import User from '../models/User.js';

// ১. ড্যাশবোর্ডের স্ট্যাটস
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

// ২. নতুন ক্লায়েন্ট অ্যাড করার ফাংশন (যেটা হারিয়ে গিয়েছিল!)
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

// ৩. সব ক্লায়েন্টদের লিস্ট পাওয়ার ফাংশন
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

// ৪. ক্লায়েন্ট আপডেট/সাসপেন্ড করার ফাংশন
export const updateClient = async (req, res) => {
    try {
        const { plan, mrr, status } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    plan: plan, 
                    mrr: Number(mrr), 
                    status: status 
                } 
            },
            { new: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Client updated successfully', 
            user: updatedUser 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};