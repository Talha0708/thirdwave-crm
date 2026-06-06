import mongoose from 'mongoose';

const pendingMessageSchema = new mongoose.Schema({
    pageId: { type: String, required: true },
    senderPsid: { type: String, required: true },
    incomingText: { type: String, required: true },
    status: { type: String, enum: ['pending', 'processing'], default: 'pending' }
}, { timestamps: true });

// 💥 ইনডেক্সিং: যাতে ডেটাবেস থেকে হাজার মেসেজও সুপার-ফাস্ট খুঁজে বের করতে পারে
pendingMessageSchema.index({ pageId: 1, status: 1, createdAt: 1 });

export default mongoose.model('PendingMessage', pendingMessageSchema);