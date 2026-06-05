import mongoose from 'mongoose';

const aiConfigSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // একজন ইউজারের একটাই কনফিগ থাকবে
    },
    systemPrompt: { 
        type: String, 
        default: "You are an expert sales assistant for THIRDWAVE-CRM. Always be polite, professional, and try to close the sale. Ask for the customer's phone number before confirming an order." 
    },
    autoReply: { 
        type: Boolean, 
        default: true 
    },
    tone: { 
        type: String, 
        default: 'professional' 
    },
    delay: { 
        type: String, 
        default: '0' 
    }
}, {
    timestamps: true
});

export default mongoose.model('AiConfig', aiConfigSchema);