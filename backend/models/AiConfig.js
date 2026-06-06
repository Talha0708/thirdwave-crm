import mongoose from 'mongoose';

const aiConfigSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true 
    },
    systemPrompt: { 
        type: String, 
        default: "You are an expert sales assistant for THIRDWAVE CRM. Always be polite, professional, and try to close the sale." 
    },
    autoReply: { type: Boolean, default: true },
    tone: { type: String, default: 'professional' },
    delay: { type: String, default: '0' },
    
    // 💥 NEW: Subscription & Rate Limiting Engine
    subscription: {
        // 💥 FIXED: 'business' added to enum!
        plan: { type: String, enum: ['free', 'basic', 'pro', 'business', 'enterprise'], default: 'free' },
        monthlyLimit: { type: Number, default: 50 }, // ফ্রি ইউজারদের জন্য 50 মেসেজ
        monthlyUsed: { type: Number, default: 0 },
        rpmLimit: { type: Number, default: 1 }, // ফ্রি ইউজারদের জন্য 1 RPM
        rpmUsed: { type: Number, default: 0 },
        lastMessageTimestamp: { type: Date, default: Date.now },
        billingCycleReset: { type: Date, default: Date.now },
        expiryDate: { type: Date } // 💥 NEW: 30 days validity tracker
    },

    integrations: {
        facebook: {
            isConnected: { type: Boolean, default: false },
            connectionMethod: { type: String, enum: ['manual', 'oauth', 'none'], default: 'none' },
            pageId: { type: String, default: "" },
            pageName: { type: String, default: "" },
            accessToken: { type: String, default: "" }
        },
        whatsapp: {
            isConnected: { type: Boolean, default: false },
            connectionMethod: { type: String, enum: ['manual', 'oauth', 'none'], default: 'none' },
            phoneNumberId: { type: String, default: "" },
            accessToken: { type: String, default: "" }
        }
    }
}, {
    timestamps: true
});

export default mongoose.model('AiConfig', aiConfigSchema);