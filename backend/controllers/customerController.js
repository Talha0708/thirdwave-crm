import Order from '../models/Order.js';
import mongoose from 'mongoose';

export const getCustomers = async (req, res) => {
    try {
        // 💥 Magic: Order কালেকশন থেকে অটোমেটিক কাস্টমার লিস্ট বানানো
        const customers = await Order.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user._id) } }, // শুধুমাত্র তোর ক্লায়েন্টের ডেটা
            {
                $group: {
                    _id: "$customerPhone", // ফোন নাম্বার দিয়ে ইউনিক কাস্টমার বের করা
                    name: { $first: "$customerName" },
                    phone: { $first: "$customerPhone" },
                    address: { $first: "$customerAddress" },
                    totalOrders: { $sum: 1 }, // কয়টা অর্ডার করেছে 
                    totalSpent: { $sum: "$totalAmount" }, // মোট কত টাকার প্রোডাক্ট কিনেছে
                    lastOrderDate: { $max: "$createdAt" } // সর্বশেষ কবে অর্ডার করেছে
                }
            },
            { $sort: { lastOrderDate: -1 } } // সবচেয়ে নতুন কাস্টমার আগে দেখাবে
        ]);

        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};