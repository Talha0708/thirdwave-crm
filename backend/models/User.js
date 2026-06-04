import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    company: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    
    // ─── NEW: CRM Business Fields ───
    plan: { type: String, enum: ['Basic', 'Pro', 'Enterprise'], default: 'Basic' },
    mrr: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Onboarding', 'Suspended'], default: 'Active' }
}, {
    timestamps: true
});

// Password Hash Logic (আগের মতোই থাকবে)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);