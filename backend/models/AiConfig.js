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
        default: "You are an expert sales assistant for THIRDWAVE-CRM. Always be polite, professional, and try to close the sale." 
    },
    autoReply: { type: Boolean, default: true },
    tone: { type: String, default: 'professional' },
    delay: { type: String, default: '0' },
    
    // 💥 ENTERPRISE INTEGRATIONS (Facebook, WhatsApp, etc.)
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