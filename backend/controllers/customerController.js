import Order from '../models/Order.js';
import mongoose from 'mongoose';

export const getCustomers = async (req, res) => {
    try {
        // 💥 Magic: Order কালেকশন থেকে অটোমেটিক কাস্টমার লিস্ট বানানো
        const customers = await Order.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user._id) } }, 
            {
                $group: {
                    _id: "$customerPhone", 
                    customerName: { $first: "$customerName" }, // 💥 ফিল্ডের নাম আপডেট
                    customerPhone: { $first: "$customerPhone" }, // 💥 ফিল্ডের নাম আপডেট
                    customerAddress: { $first: "$customerAddress" }, // 💥 ফিল্ডের নাম আপডেট
                    totalOrders: { $sum: 1 }, 
                    totalSpent: { $sum: "$totalAmount" }, 
                    lastOrderDate: { $max: "$createdAt" } 
                }
            },
            { $sort: { lastOrderDate: -1 } } 
        ]);

        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};