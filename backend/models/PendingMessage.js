import mongoose from 'mongoose';

const pendingMessageSchema = new mongoose.Schema({
    pageId: { type: String, required: true }, // FB Page ID অথবা WhatsApp Phone ID
    senderPsid: { type: String, required: true }, // FB User ID অথবা WhatsApp Phone Number
    incomingText: { type: String, required: true },
    status: { type: String, enum: ['pending', 'processing'], default: 'pending' },
    platform: { type: String, enum: ['facebook', 'whatsapp'], default: 'facebook' } // 💥 NEW: প্ল্যাটফর্ম চেনার জন্য
}, { timestamps: true });

// ইনডেক্সিং: স্পিড পারফরম্যান্সের জন্য প্ল্যাটফর্মটাও এড করে দিলাম
pendingMessageSchema.index({ pageId: 1, status: 1, platform: 1, createdAt: 1 });

export default mongoose.model('PendingMessage', pendingMessageSchema);