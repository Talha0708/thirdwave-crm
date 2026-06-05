import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    customerName: { 
        type: String, 
        required: true 
    },
    customerPhone: { 
        type: String, 
        required: true 
    },
    customerAddress: { 
        type: String, 
        required: true 
    },
    productName: { 
        type: String, 
        required: true 
    },
    totalAmount: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered'],
        default: 'Pending' 
    }
}, {
    timestamps: true
});

export default mongoose.model('Order', orderSchema);