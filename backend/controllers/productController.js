import Product from '../models/Product.js';

// ১. ক্লায়েন্টের সব প্রোডাক্ট ফেচ করা
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
};

// ২. নতুন প্রোডাক্ট অ্যাড করা (Bulletproof Engine)
export const addProduct = async (req, res) => {
    try {
        // রিকোয়েস্ট বডি থেকে সব ডেটা নিয়ে সরাসরি ডেটাবেসে পুশ করা হচ্ছে
        const product = await Product.create({
            user: req.user._id,
            ...req.body
        });
        
        res.status(201).json({ success: true, message: 'Product added', data: product });
    } catch (error) {
        // 💥 ক্র্যাশ না করে সরাসরি এরর মেসেজ ফ্রন্টএন্ডে পাঠিয়ে দেবে
        console.error("🔥 ADD PRODUCT ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message || 'Server Error on saving' });
    }
};

// ৩. প্রোডাক্ট এডিট/আপডেট করা
export const updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // অন্য কেউ যেন এডিট করতে না পারে তার সেফটি
        if (product.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        product = await Product.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true }
        );
        
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
};

// ৪. প্রোডাক্ট ডিলিট করা
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        await product.deleteOne();
        res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
};