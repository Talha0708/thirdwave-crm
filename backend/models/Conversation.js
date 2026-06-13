import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: { 
        type: String, 
        required: true, 
        enum: ['user', 'assistant', 'system'] 
    },
    content: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

const conversationSchema = new mongoose.Schema({
    senderId: { 
        type: String, 
        required: true
    },
    pageId: { 
        type: String, 
        required: true 
    },
    messages: [messageSchema]
}, { timestamps: true });

// ইনডেক্সিং করে দিলাম যাতে ডাটাবেস দ্রুত কাস্টমার খুঁজে পায়
conversationSchema.index({ senderId: 1, pageId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;