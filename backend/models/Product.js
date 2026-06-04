import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    status: { type: String, default: 'Active' },
    sizes: [{ type: String }],
    
    // 💥 এই দুইটা ফিল্ড অ্যাড করা হলো যাতে Mongoose এগুলোকে ডিলিট না করে
    shopId: { type: String },
    code: { type: String }
}, {
    timestamps: true,
    strict: false // 💥 ম্যাজিক লাইন: এখন থেকে কোনো এক্সট্রা ডেটা Mongoose রিজেক্ট করবে না!
});

export default mongoose.model('Product', productSchema);