import Order from '../models/Order.js';

// ১. নতুন অর্ডার তৈরি (ফর্ম এবং AI দুইটার জন্যই)
export const createOrder = async (req, res) => {
    try {
        const { customerName, customerPhone, customerAddress, productName, totalAmount, status } = req.body;

        const order = await Order.create({
            user: req.user._id, // লগড ইন ক্লায়েন্ট
            customerName,
            customerPhone,
            customerAddress,
            productName,
            totalAmount,
            status: status || 'Pending'
        });

        res.status(201).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ২. ক্লায়েন্টের সব অর্ডার দেখা
export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ৩. ড্র্যাগ অ্যান্ড ড্রপ বা স্ট্যাটাস আপডেট
export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );

        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};