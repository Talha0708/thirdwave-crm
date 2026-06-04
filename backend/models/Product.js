import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    // কোন ক্লায়েন্টের প্রোডাক্ট, সেটা ট্র্যাক করার জন্য (Foreign Key)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    name: { type: String, required: true },
    category: { type: String }, // e.g. Shirt, Pant, Accessories
    price: { type: Number, required: true },
    sizes: [{ type: String }], // e.g. ['S', 'M', 'L', 'XL']
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Draft', 'Out of Stock'], default: 'Active' }
}, {
    timestamps: true,
    strict: false
});

export default mongoose.model('Product', productSchema);