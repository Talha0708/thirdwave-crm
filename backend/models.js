'use strict';

const mongoose = require('mongoose');

// ── User Schema ───────────────────────────────────────────────
// System er admin ba shop owner der data ekhane thakbe
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ── Shop Schema (Tenant Profile) ─────────────────────────────
// Client der shop er data, Meta/WhatsApp API credentials, ar AI Config ekhane thakbe
const ShopSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shopName: { type: String, required: true, trim: true },

    // Meta / Facebook integration
    metaPageId:      { type: String, default: '' },
    metaAccessToken: { type: String, default: '' },

    // WhatsApp integration
    whatsappPhoneNumberId: { type: String, default: '' },
    whatsappAccessToken:   { type: String, default: '' },

    // AI config
    isAIActive:   { type: Boolean, default: false },
    systemPrompt: { type: String,  default: 'You are a smart sales assistant.' },

    // Admin SaaS controls
    isActive: { type: Boolean, default: true },

    // Subscription Plans (Pro plan perfectly added here)
    plan: {
        type: String,
        enum: ['Starter', 'Business', 'Pro', 'Enterprise'],
        default: 'Starter',
    },
    monthlyMessageCount: { type: Number, default: 0, min: 0 },
    resetDate:           { type: Date,   default: Date.now   },
}, { timestamps: true });

// ── Product Schema ────────────────────────────────────────────
// Shop er inventory ba product list
const ProductSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    sizes: { type: [String], default: [] }, // Array for multiple sizes
    color: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true },
    isActive:  { type: Boolean, default: true },
}, { timestamps: true });

// Compound unique index: same code can't appear twice in the same shop
ProductSchema.index({ shopId: 1, code: 1 }, { unique: true });

// ── Order Item Sub-Schema ─────────────────────────────────────
// Ekta order er vitor eker odhik item thakte pare, tai ei sub-schema
const OrderItemSchema = new mongoose.Schema({
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    size:        { type: String, default: 'FREE SIZE' },
    color:       { type: String, default: '' },
    quantity:    { type: Number, default: 1, min: 1 },
    unitPrice:   { type: Number, default: 0 },
    subTotal:    { type: Number, default: 0 },
});

// ── Order Schema ──────────────────────────────────────────────
// Final order format jeta customer AI ke dibe
const OrderSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phoneNumber:  { type: String, required: true, trim: true },
    address:      { type: String, required: true, trim: true },
    
    // items array using the Sub-Schema
    items:        [OrderItemSchema],
    
    deliveryLocation: { type: String, default: '' },
    deliveryCharge:   { type: Number, default: 0, min: 0 },
    totalPrice:       { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending',
    },
}, { timestamps: true });

// ── Chat History Schema ───────────────────────────────────────
// Database e matro last 20 ta message store korar jonno AI history format
const ChatHistorySchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    psid: { type: String, required: true },
    messages: [{
        role:  { type: String, enum: ['user', 'model'], required: true },
        parts: [{ text: { type: String, default: '' } }],
    }],
}, { timestamps: true });

// Compound unique index: one history doc per (shop, psid) pair
ChatHistorySchema.index({ shopId: 1, psid: 1 }, { unique: true });

// ── Exports ───────────────────────────────────────────────────
module.exports = {
    User:        mongoose.model('User',        UserSchema),
    Shop:        mongoose.model('Shop',        ShopSchema),
    Product:     mongoose.model('Product',     ProductSchema),
    Order:       mongoose.model('Order',       OrderSchema),
    ChatHistory: mongoose.model('ChatHistory', ChatHistorySchema),
};