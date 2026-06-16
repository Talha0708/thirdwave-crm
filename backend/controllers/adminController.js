import User from '../models/User.js';
import AiConfig from '../models/AiConfig.js';

// 💥 মাস্টার প্রাইসিং ইঞ্জিন: নতুন ৪ টিয়ারের লিমিট এবং স্পিড লক করে দেওয়া হলো!
const getPlanDetails = (plan) => {
    const p = plan?.toLowerCase() || 'basic';
    if (p === 'enterprise') return { mrr: 8000, monthlyLimit: 30000, rpmLimit: 12, name: 'Enterprise' };
    if (p === 'business') return { mrr: 3000, monthlyLimit: 12000, rpmLimit: 10, name: 'Business' };
    if (p === 'pro') return { mrr: 1200, monthlyLimit: 5000, rpmLimit: 7, name: 'Pro' };
    return { mrr: 500, monthlyLimit: 3000, rpmLimit: 3, name: 'Basic' };
};

// 💥 হেল্পার: আজ থেকে ঠিক ৩০ দিন পরের ডেট বের করা (Billing Cycle)
const getExpiryDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

// ১. ড্যাশবোর্ডের স্ট্যাটস (সাথে রিয়েল MRR ক্যালকুলেশন)
export const getDashboardStats = async (req, res) => {
    try {
        const totalClients = await User.countDocuments({ role: 'user' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        // সব ইউজারের MRR যোগ করে টোটাল রেভিনিউ বের করা
        const allUsers = await User.find({ role: 'user' });
        const totalRevenue = allUsers.reduce((sum, user) => sum + (user.mrr || 0), 0);

        const recentUsers = await User.find({ role: 'user' })
                                      .select('-password')
                                      .sort({ createdAt: -1 })
                                      .limit(5);

        res.status(200).json({
            success: true,
            stats: { totalClients, totalAdmins, activeProjects: totalClients, revenue: totalRevenue },
            recentUsers
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ২. নতুন ক্লায়েন্ট অ্যাড করার ফাংশন (Strict Limits & 30 Days Expiry)
export const addClient = async (req, res) => {
    try {
        const { name, email, password, company, plan, status } = req.body;
        
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: 'Email already exists' });

        // ব্যাকএন্ড নিজে প্ল্যানের ডিটেইলস বের করবে
        const planDetails = getPlanDetails(plan);

        // ১. ইউজার ক্রিয়েট করা (অটোমেটিক MRR সহ)
        const user = await User.create({ 
            name, email, password, company, role: 'user', 
            plan: planDetails.name, 
            mrr: planDetails.mrr, 
            status: status || 'Active' 
        });

        // ২. AiConfig বানানো (অটোমেটিক লিমিট ও ৩০ দিনের মেয়াদ সহ)
        await AiConfig.create({
            user: user._id,
            subscription: {
                plan: planDetails.name.toLowerCase(),
                monthlyLimit: planDetails.monthlyLimit,
                rpmLimit: planDetails.rpmLimit,
                monthlyUsed: 0,
                rpmUsed: 0,
                expiryDate: getExpiryDate() // 💥 30 days validity started
            }
        });

        res.status(201).json({ success: true, message: 'Client added successfully', user });
    } catch (error) {
        console.error("Add Client Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ৩. সব ক্লায়েন্টদের লিস্ট পাওয়ার ফাংশন (💥 AI Usage ডেটার সাথে মার্জ করে)
export const getAllClients = async (req, res) => {
    try {
        // lean() ইউজ করা হয়েছে যাতে সহজে ডাটা মডিফাই করা যায়
        const users = await User.find({ role: 'user' })
                                .select('-password')
                                .sort({ createdAt: -1 })
                                .lean();

        // 💥 AI Config গুলো বের করে আনা হচ্ছে
        const configs = await AiConfig.find({ user: { $in: users.map(u => u._id) } }).lean();

        // 💥 ইউজার ডেটার সাথে AI Usage & Expiry মার্জ করা হচ্ছে
        const data = users.map(user => {
            const config = configs.find(c => c.user.toString() === user._id.toString());
            return { 
                ...user, 
                subscription: config?.subscription || null,
                aiConfig: config || {} // 💥 FIX: ফ্রন্টএন্ডে API Key স্ট্যাটাস দেখানোর জন্য পুরো কনফিগ পাঠানো হলো!
            };
        });

        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error("Get All Clients Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ৪. ক্লায়েন্ট আপডেট/সাসপেন্ড করার ফাংশন (Renew Limits & Expiry)
export const updateClient = async (req, res) => {
    try {
        const { plan, status } = req.body;
        
        // প্ল্যান আপডেট হলে ব্যাকএন্ড নতুন ডিটেইলস বের করবে
        const planDetails = getPlanDetails(plan);
        
        // ১. ইউজারের ডাটা আপডেট করা
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    plan: planDetails.name, 
                    mrr: planDetails.mrr, 
                    status: status 
                } 
            },
            { new: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // ২. AiConfig এর লিমিটও আপডেট করে দেওয়া, ইউজড জিরো করা এবং 💥 মেয়াদ আরও ৩০ দিন বাড়ানো
        await AiConfig.findOneAndUpdate(
            { user: req.params.id },
            {
                $set: {
                    "subscription.plan": planDetails.name.toLowerCase(),
                    "subscription.monthlyLimit": planDetails.monthlyLimit,
                    "subscription.rpmLimit": planDetails.rpmLimit,
                    "subscription.monthlyUsed": 0, 
                    "subscription.expiryDate": getExpiryDate() // 💥 Renewed for 30 more days
                }
            },
            { upsert: true } 
        );

        res.status(200).json({ 
            success: true, 
            message: 'Client, Limits, and Expiry renewed successfully', 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Client Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// 💥 ৫. NEW: System API (Pro) Toggle করার ফাংশন
export const toggleSystemApi = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { useSystemApiKey } = req.body;

        const updatedConfig = await AiConfig.findOneAndUpdate(
            { user: clientId },
            { $set: { useSystemApiKey: useSystemApiKey } },
            { new: true, upsert: true } 
        );

        if (!updatedConfig) {
            return res.status(404).json({ success: false, error: "AI Config not found for this client." });
        }

        res.status(200).json({ success: true, message: "System API access updated successfully!" });
    } catch (error) {
        console.error("Toggle API Error:", error);
        res.status(500).json({ success: false, error: "Failed to update System API access" });
    }
};