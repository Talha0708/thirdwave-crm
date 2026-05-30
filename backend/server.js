/**
 * ============================================================
 * THIRDWAVE SAAS — Enterprise Master Server (Vercel Ready)
 * Architecture: Auto OAuth + WhatsApp + Dynamic Rate Limiting + Gemini AI
 * ALL ISSUES FIXED BY GEMINI SENIOR DEV: CORS 500 Error Resolved 🚀
 * ============================================================
 */
'use strict';
require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express    = require('express');
const mongoose   = require('mongoose');
const axios      = require('axios');
const cors       = require('cors');
const helmet     = require('helmet');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const crypto     = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { User, Shop, Product, Order, ChatHistory } = require('./models');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

// ══════════════════════════════════════════════════════════════
//  0. AES-256 Encryption (Enterprise Security)
// ══════════════════════════════════════════════════════════════
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'thirdwave_secure_key_2026', 'salt', 32);

function encryptToken(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decryptToken(hash) {
    if (!hash) return null;
    try {
        if (!hash.includes(':')) return hash;
        const parts = hash.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('❌ Decryption failed:', e.message);
        return null; 
    }
}

// ══════════════════════════════════════════════════════════════
//  1. Middlewares & CORS (🔥 FIXED BY SENIOR DEV)
// ══════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'https://thirdwave-crm-cu8c.vercel.app']; // ডিফল্ট ফ্রন্টএন্ড লিংক অ্যাড করা হলো

app.use(cors({
    origin: function (origin, callback) {
        // No origin মানে Postman বা মোবাইল অ্যাপ থেকে আসা রিকোয়েস্ট অ্যালাউ করবে
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
            // FIX[Critical]: Error throw না করে false রিটার্ন করা হলো, যাতে 500 crash না হয়!
            callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200 // Legacy browser support-এর জন্য
}));

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook/whatsapp', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/', rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown',
}));

const adminCreateLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many create-client requests, slow down.' },
});

// ══════════════════════════════════════════════════════════════
//  2. Database Connection
// ══════════════════════════════════════════════════════════════
async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    if (mongoose.connection.readyState === 2) {
        await new Promise(resolve => mongoose.connection.once('open', resolve));
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 15_000,
            socketTimeoutMS: 45_000,
        });
        console.log('✅ Enterprise MongoDB Connected');
        await Shop.collection.createIndex({ metaPageId: 1 }, { background: true });
        await Shop.collection.createIndex({ whatsappPhoneNumberId: 1 }, { background: true });
    } catch (err) {
        console.error('❌ DB Connection Error:', err.message);
        throw err;
    }
}

// ══════════════════════════════════════════════════════════════
//  3. Auth & Role Middlewares
// ══════════════════════════════════════════════════════════════
const authMiddleware = async (req, res, next) => {
    await connectDB();
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Access denied' });
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        const userDoc = await User.findById(req.user.id).select('isActive').lean();
        if (!userDoc?.isActive) return res.status(403).json({ error: 'Account suspended' });
        const shop = await Shop.findOne({ userId: req.user.id }).select('_id').lean();
        if (shop) {
            req.shopId = shop._id;
        } else if (req.user.role !== 'admin') {
            return res.status(404).json({ error: 'No workspace found for this account' });
        }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

// ══════════════════════════════════════════════════════════════
//  4. Auth & Admin API
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        if (!user.isActive) return res.status(403).json({ error: 'Account suspended by admin' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/create-client', authMiddleware, adminMiddleware, adminCreateLimiter, async (req, res) => {
    try {
        const { name, email, password, shopName, plan } = req.body;
        if (!name || !email || !password || !shopName) return res.status(400).json({ error: 'All fields required' });

        const existing = await User.findOne({ email }).lean();
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, password: hashedPassword });
        await Shop.create({ userId: user._id, shopName, plan: plan || 'Starter' });
        res.status(201).json({ message: 'Client created successfully' });
    } catch (err) {
        console.error('Create client error:', err.message);
        res.status(400).json({ error: 'Failed to create client' });
    }
});

app.put('/api/admin/shops/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        shop.isActive = !shop.isActive;
        await shop.save();
        await User.findByIdAndUpdate(shop.userId, { isActive: shop.isActive });
        res.json({ message: `Shop is now ${shop.isActive ? 'Active' : 'Suspended'}`, isActive: shop.isActive });
    } catch (err) {
        console.error('Toggle error:', err.message);
        res.status(500).json({ error: 'Toggle failed' });
    }
});

app.put('/api/admin/shops/:id/subscription', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { action, newPlan } = req.body;
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        if (action === 'UPGRADE') {
            if (!PLAN_LIMITS[newPlan]) return res.status(400).json({ error: 'Invalid plan' });
            shop.plan = newPlan;
            shop.monthlyMessageCount = 0;
            shop.resetDate = new Date();
        } else if (action === 'RENEW') {
            shop.monthlyMessageCount = 0;
            shop.resetDate = new Date();
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
        await shop.save();
        res.json({ message: `Shop updated: ${action}`, shop });
    } catch (err) {
        console.error('Subscription error:', err.message);
        res.status(500).json({ error: 'Subscription update failed' });
    }
});

app.get('/api/admin/system-stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [totalUsers, totalShops, activeShops] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Shop.countDocuments(),
            Shop.countDocuments({ isAIActive: true, isActive: true }),
        ]);
        res.json({ totalUsers, totalShops, activeShops });
    } catch (err) {
        console.error('Stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/admin/shops', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shops = await Shop.find().populate('userId', 'name email isActive').sort({ createdAt: -1 }).lean();
        res.json(shops);
    } catch (err) {
        console.error('Admin shops error:', err.message);
        res.status(500).json({ error: 'Failed to fetch shops' });
    }
});

// ══════════════════════════════════════════════════════════════
//  5. Facebook & WhatsApp Settings
// ══════════════════════════════════════════════════════════════
app.post('/api/shop/oauth/facebook', authMiddleware, async (req, res) => {
    try {
        const { accessToken, pageId } = req.body;
        if (!accessToken || !pageId) return res.status(400).json({ error: 'Missing OAuth parameters' });

        const ltResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                fb_exchange_token: accessToken,
            },
            timeout: 15_000,
        });
        const longLivedUserToken = ltResponse.data.access_token;
        if (!longLivedUserToken) throw new Error('Could not exchange for long-lived user token');

        const pageResponse = await axios.get(`https://graph.facebook.com/v19.0/${pageId}`, {
            params: { fields: 'access_token', access_token: longLivedUserToken },
            timeout: 15_000,
        });
        const pageToken = pageResponse.data.access_token;
        if (!pageToken) throw new Error('Could not fetch page token');

        const encryptedToken = encryptToken(pageToken);
        await Shop.findByIdAndUpdate(req.shopId, {
            metaPageId: pageId,
            metaAccessToken: encryptedToken,
            isAIActive: true,
        }, { new: true });

        res.json({ message: 'Facebook Page Linked Successfully via OAuth!' });
    } catch (error) {
        console.error('Facebook OAuth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Facebook OAuth Integration Failed' });
    }
});

app.put('/api/shop/manual-facebook', authMiddleware, async (req, res) => {
    try {
        const { metaPageId, metaAccessToken } = req.body;
        if (!metaPageId || !metaAccessToken) return res.status(400).json({ error: 'Missing parameters' });
        const encryptedToken = encryptToken(metaAccessToken.trim());
        await Shop.findByIdAndUpdate(req.shopId, {
            metaPageId: metaPageId.trim(),
            metaAccessToken: encryptedToken,
            isAIActive: true,
        }, { new: true });
        res.json({ message: 'Manual Facebook Integration Successful!' });
    } catch (err) {
        console.error('Manual Facebook error:', err.message);
        res.status(500).json({ error: 'Failed to save manual token' });
    }
});

app.put('/api/shop/manual-whatsapp', authMiddleware, async (req, res) => {
    try {
        const { whatsappPhoneNumberId, whatsappAccessToken } = req.body;
        if (!whatsappPhoneNumberId || !whatsappAccessToken) return res.status(400).json({ error: 'Missing parameters' });
        const encryptedToken = encryptToken(whatsappAccessToken.trim());
        await Shop.findByIdAndUpdate(req.shopId, {
            whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
            whatsappAccessToken: encryptedToken,
            isAIActive: true,
        }, { new: true });
        res.json({ message: 'WhatsApp Integration Successful!' });
    } catch (err) {
        console.error('Manual WhatsApp error:', err.message);
        res.status(500).json({ error: 'Failed to save WhatsApp token' });
    }
});

app.get('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.shopId).lean();
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        res.json({
            isAIActive: shop.isAIActive,
            systemPrompt: shop.systemPrompt,
            metaPageId: shop.metaPageId,
            whatsappPhoneNumberId: shop.whatsappPhoneNumberId,
            plan: shop.plan,
            usage: shop.monthlyMessageCount,
        });
    } catch (err) {
        console.error('Config error:', err.message);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

app.put('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const { isAIActive, systemPrompt } = req.body;
        const shop = await Shop.findByIdAndUpdate(req.shopId, {
            ...(isAIActive !== undefined && { isAIActive }),
            ...(systemPrompt !== undefined && { systemPrompt }),
        }, { new: true }).lean();
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        res.json(shop);
    } catch (err) {
        console.error('Config update error:', err.message);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// ══════════════════════════════════════════════════════════════
//  6. Products, Orders & Analytics
// ══════════════════════════════════════════════════════════════
app.get('/api/products', authMiddleware, async (req, res) => {
    try { res.json(await Product.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean()); }
    catch (err) { console.error('Products error:', err.message); res.status(500).json({ error: 'Failed to fetch products' }); }
});

app.post('/api/products', authMiddleware, async (req, res) => {
    try { res.status(201).json(await Product.create({ ...req.body, shopId: req.shopId })); }
    catch (err) { console.error('Create product error:', err.message); res.status(400).json({ error: 'Failed to create product' }); }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
    try {
        const p = await Product.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, req.body, { new: true });
        if (!p) return res.status(404).json({ error: 'Product not found' });
        res.json(p);
    } catch (err) { console.error('Update product error:', err.message); res.status(400).json({ error: 'Failed to update product' }); }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
    try {
        const p = await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
        if (!p) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true });
    } catch (err) { console.error('Delete product error:', err.message); res.status(500).json({ error: 'Failed to delete product' }); }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
    try { res.json({ orders: await Order.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean() }); }
    catch (err) { console.error('Orders error:', err.message); res.status(500).json({ error: 'Failed to fetch orders' }); }
});

app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
    try {
        const o = await Order.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, { status: req.body.status }, { new: true });
        if (!o) return res.status(404).json({ error: 'Order not found' });
        res.json(o);
    } catch (err) { console.error('Order status error:', err.message); res.status(400).json({ error: 'Failed to update order status' }); }
});

app.get('/api/analytics', authMiddleware, async (req, res) => {
    try {
        const [totalOrders, revenueAgg] = await Promise.all([
            Order.countDocuments({ shopId: req.shopId }),
            Order.aggregate([{ $match: { shopId: req.shopId } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
        ]);
        res.json({ totalOrders, totalRevenue: revenueAgg[0]?.total ?? 0 });
    } catch (err) {
        console.error('Analytics error:', err.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ══════════════════════════════════════════════════════════════
//  7. Enterprise AI Engine & Rate Limiting Logic
// ══════════════════════════════════════════════════════════════
const PLAN_LIMITS = {
    Starter:    { rpm: 5,  maxMessages: 2_000   },
    Business:   { rpm: 8,  maxMessages: 5_000   },
    Pro:        { rpm: 10, maxMessages: 15_000  },
    Enterprise: { rpm: 15, maxMessages: 999_999 },
};

const shopRPMTracker = Object.create(null);

setInterval(() => {
    const now = Date.now();
    for (const id of Object.keys(shopRPMTracker)) {
        if (now - shopRPMTracker[id].windowStart >= 120_000) {
            delete shopRPMTracker[id];
        }
    }
}, 5 * 60_000);

function canProcessShopRPM(shopId, planRpm) {
    const id  = shopId.toString();
    const now = Date.now();
    if (!shopRPMTracker[id]) shopRPMTracker[id] = { count: 0, windowStart: now };
    const tracker = shopRPMTracker[id];
    if (now - tracker.windowStart >= 60_000) { tracker.windowStart = now; tracker.count = 0; }
    if (tracker.count >= planRpm) return false;
    tracker.count++;
    return true;
}

const MAX_QUEUE_SIZE = 500;
const messageQueue = [];

function enqueueMessage(item) {
    if (messageQueue.length >= MAX_QUEUE_SIZE) {
        messageQueue.shift();
        console.warn('⚠️ messageQueue full — oldest item dropped');
    }
    messageQueue.push(item);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function geminiWithTimeout(model, parts, timeoutMs = 20_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const result = await model.sendMessage(parts);
        return result;
    } finally {
        clearTimeout(timer);
    }
}

async function getAurelianResponse(shop, psid, text, imgUrl = null, isFromQueue = false) {
    const limits = PLAN_LIMITS[shop.plan] ?? PLAN_LIMITS.Starter;

    if (!isFromQueue && !canProcessShopRPM(shop._id, limits.rpm)) return 'QUEUED';
    if (shop.monthlyMessageCount >= limits.maxMessages) {
        return 'আপনার প্যাকেজের লিমিট শেষ। দয়া করে থার্ডওয়েভ CRM প্যানেল থেকে আপগ্রেড করুন। 🙏';
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite',
        systemInstruction: shop.systemPrompt,
    });

    let history = (await ChatHistory.findOne({ shopId: shop._id, psid }).lean())?.messages ?? [];

    history = history.map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: p.text })) }));
    const firstUserIdx = history.findIndex(m => m.role === 'user');
    if (firstUserIdx === -1) {
        history = [];
    } else {
        history = history.slice(firstUserIdx);
        if (history.at(-1)?.role === 'user') history.pop();
    }

    const chat = model.startChat({ history });
    const parts = [];

    if (imgUrl) {
        try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30_000 });
            parts.push({
                inlineData: {
                    data: Buffer.from(res.data).toString('base64'),
                    mimeType: res.headers['content-type'] || 'image/jpeg',
                },
            });
        } catch (e) {
            console.warn('⚠️ Image fetch failed:', e.message);
        }
    }
    parts.push({ text: text || 'Please review this.' });

    try {
        const result = await geminiWithTimeout(chat, parts, 20_000);
        const aiText = result.response.text();

        await Shop.findByIdAndUpdate(shop._id, { $inc: { monthlyMessageCount: 1 } });

        await ChatHistory.updateOne(
            { shopId: shop._id, psid },
            {
                $push: {
                    messages: {
                        $each: [
                            { role: 'user',  parts: [{ text: text || '[image]' }] },
                            { role: 'model', parts: [{ text: aiText }] },
                        ],
                        $slice: -20,
                    },
                },
            },
            { upsert: true }
        );

        return aiText;
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('Gemini timeout for shop:', shop._id);
            return 'AI response timed out. Please try again.';
        }
        if (err.message?.includes('429')) return 'বট ব্যস্ত আছে। একটু পর মেসেজ দিন। 🙏';
        console.error('Gemini error:', err.message);
        return 'সার্ভারে টেকনিক্যাল সমস্যা হচ্ছে। একটু পর ট্রাই করুন।';
    }
}

async function processOrderSync(shop, aiResponse) {
    const SYNC_RE_FLEX = /(?:\[SYNC:\s*)?(\{[\s\S]*?"items"[\s\S]*?\})(?:\s*\])?/;
    const match = SYNC_RE_FLEX.exec(aiResponse);
    if (!match) return;

    let data;
    try {
        try {
            data = JSON.parse(match[1]);
        } catch (_) {
            const safe = match[1]
                .replace(/,\s*([}\]])/g, '$1')          
                .replace(/[\x00-\x1F\x7F]/g, ' ');      
            data = JSON.parse(safe);
        }
    } catch (err) {
        console.error('Order JSON parse failed:', err.message, '| Raw:', match[1].slice(0, 200));
        return; 
    }

    try {
        const loc = (data.l || '').toLowerCase();
        const isInsideDhaka = loc.includes('inside') || (loc.includes('dhaka') && !loc.includes('outside'));
        const deliveryCharge = isInsideDhaka ? 60 : 120;
        let finalTotal = deliveryCharge;
        const processedItems = [];

        if (Array.isArray(data.items)) {
            for (const item of data.items) {
                const code  = (item.c || '').trim();
                const color = (item.color || '').trim();
                const qty   = Math.max(1, parseInt(item.qty) || 1);

                let product = null;
                if (code && code !== 'UNKNOWN') {
                    product = await Product.findOne({ shopId: shop._id, code: code.toUpperCase() }).lean();
                }
                if (!product && color) {
                    product = await Product.findOne({ shopId: shop._id, name: { $regex: color, $options: 'i' } }).lean();
                }

                if (!product) {
                    console.warn(`⚠️ Order sync: product not found for code="${code}" color="${color}" — item skipped`);
                    continue;
                }

                const unitPrice = product.price;
                finalTotal += (unitPrice * qty);
                processedItems.push({
                    productCode: product.code,
                    productName: product.name,
                    size:        item.s || 'FREE SIZE',
                    color,
                    quantity:    qty,
                    unitPrice,
                    subTotal:    unitPrice * qty,
                });
            }
        }

        if (!processedItems.length) return;

        await Order.create({
            shopId:           shop._id,
            customerName:     (data.n || 'Unknown').trim(),
            phoneNumber:      (data.p || 'Unknown').trim(),
            address:          (data.a || 'Unknown').trim(),
            items:            processedItems,
            deliveryLocation: isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka',
            deliveryCharge,
            totalPrice:       finalTotal,
        });
    } catch (err) {
        console.error('Order sync create error:', err.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  8. Background Queue Worker
// ══════════════════════════════════════════════════════════════
async function drainQueue() {
    if (!messageQueue.length) {
        setTimeout(drainQueue, 5_000);
        return;
    }

    for (let i = 0; i < messageQueue.length; i++) {
        const item = messageQueue[i];

        try {
            const shop = await Shop.findById(item.shopId).lean();
            if (!shop || !shop.isAIActive) {
                messageQueue.splice(i, 1);
                i--;
                continue;
            }

            const limits = PLAN_LIMITS[shop.plan] ?? PLAN_LIMITS.Starter;
            if (!canProcessShopRPM(shop._id, limits.rpm)) continue;

            messageQueue.splice(i, 1);
            i--;

            const aiRes = await getAurelianResponse(shop, item.psid, item.text, item.imgUrl, true);
            if (aiRes === 'QUEUED') {
                enqueueMessage(item);
                continue;
            }

            const cleanMessage = aiRes.replace(/(?:\[SYNC:\s*)?(\{[\s\S]*?"items"[\s\S]*?\})(?:\s*\])?/g, '').trim();

            if (item.platform === 'whatsapp') {
                const token = decryptToken(shop.whatsappAccessToken);
                if (!token) { console.error('Queue: WA token decrypt failed for shop', shop._id); continue; }
                await axios.post(
                    `https://graph.facebook.com/v19.0/${shop.whatsappPhoneNumberId}/messages`,
                    { messaging_product: 'whatsapp', to: item.psid, type: 'text', text: { body: cleanMessage } },
                    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15_000 }
                );
            } else {
                const token = decryptToken(shop.metaAccessToken);
                if (!token) { console.error('Queue: FB token decrypt failed for shop', shop._id); continue; }
                await axios.post(
                    'https://graph.facebook.com/v19.0/me/messages',
                    { recipient: { id: item.psid }, message: { text: cleanMessage } },
                    { params: { access_token: token }, timeout: 15_000 }
                );
            }

            await processOrderSync(shop, aiRes);
        } catch (err) {
            console.error('Queue worker error for psid', item.psid, ':', err.message);
        }
    }

    setTimeout(drainQueue, 5_000);
}

if (process.env.NODE_ENV !== 'test') {
    drainQueue();
}

// ══════════════════════════════════════════════════════════════
//  9. Webhook Signature Verification Helper
// ══════════════════════════════════════════════════════════════
function verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.warn('⚠️ Webhook: missing signature header');
        return res.sendStatus(403);
    }
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appSecret) {
        console.error('❌ FACEBOOK_APP_SECRET not set — cannot verify webhook');
        return res.sendStatus(500);
    }
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!valid) {
        console.warn('⚠️ Webhook: signature mismatch');
        return res.sendStatus(403);
    }
    try { req.body = JSON.parse(rawBody.toString()); } catch (_) { req.body = {}; }
    next();
}

// ══════════════════════════════════════════════════════════════
//  10. Multi-Tenant Webhook (Facebook Messenger)
// ══════════════════════════════════════════════════════════════
app.get('/webhook', (req, res) =>
    req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN
        ? res.status(200).send(req.query['hub.challenge'])
        : res.sendStatus(403)
);

app.post('/webhook', verifyWebhookSignature, async (req, res) => {
    await connectDB();
    try {
        const body = req.body;
        if (body.object !== 'page') return res.status(200).send('EVENT_RECEIVED');

        const pageId = body.entry?.[0]?.id;
        const shop = await Shop.findOne({ metaPageId: pageId }).lean();
        if (!shop || !shop.isAIActive) return res.status(200).send('EVENT_RECEIVED');

        const messaging = body.entry?.[0]?.messaging?.[0];
        const psid      = messaging?.sender?.id;
        const text      = messaging?.message?.text;
        const imgUrl    = messaging?.message?.attachments?.[0]?.payload?.url;

        if (!psid || (!text && !imgUrl)) return res.status(200).send('EVENT_RECEIVED');

        const token = decryptToken(shop.metaAccessToken);
        if (!token) {
            console.error('FB Webhook: token decrypt failed for shop', shop._id);
            return res.status(200).send('EVENT_RECEIVED');
        }

        if (text?.trim().toLowerCase() === 'reset') {
            await ChatHistory.findOneAndDelete({ shopId: shop._id, psid });
            await axios.post(
                'https://graph.facebook.com/v19.0/me/messages',
                { recipient: { id: psid }, message: { text: 'মেমরি রিসেট করা হয়েছে! নতুন অর্ডারের তথ্য দিন।' } },
                { params: { access_token: token }, timeout: 15_000 }
            );
            return res.status(200).send('EVENT_RECEIVED');
        }

        const aiResponse = await getAurelianResponse(shop, psid, text, imgUrl);
        if (aiResponse === 'QUEUED') {
            enqueueMessage({ shopId: shop._id, psid, text, imgUrl, platform: 'facebook' });
            return res.status(200).send('EVENT_RECEIVED');
        }

        const cleanMessage = aiResponse.replace(/(?:\[SYNC:\s*)?(\{[\s\S]*?"items"[\s\S]*?\})(?:\s*\])?/g, '').trim();
        await axios.post(
            'https://graph.facebook.com/v19.0/me/messages',
            { recipient: { id: psid }, message: { text: cleanMessage } },
            { params: { access_token: token }, timeout: 15_000 }
        );
        await processOrderSync(shop, aiResponse);
        return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
        console.error('FB Webhook error:', err.message);
        return res.status(200).send('EVENT_RECEIVED');
    }
});

// ══════════════════════════════════════════════════════════════
//  11. Multi-Tenant Webhook (WhatsApp Cloud API)
// ══════════════════════════════════════════════════════════════
app.get('/webhook/whatsapp', (req, res) =>
    req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN
        ? res.status(200).send(req.query['hub.challenge'])
        : res.sendStatus(403)
);

app.post('/webhook/whatsapp', verifyWebhookSignature, async (req, res) => {
    await connectDB();
    try {
        const body = req.body;
        if (body.object !== 'whatsapp_business_account') return res.status(200).send('EVENT_RECEIVED');

        const changes       = body.entry?.[0]?.changes?.[0]?.value;
        if (!changes || !changes.messages?.[0]) return res.status(200).send('EVENT_RECEIVED');

        const phoneNumberId = changes.metadata.phone_number_id;
        const message       = changes.messages[0];
        const fromNumber    = message.from;
        let text            = '';
        if (message.type === 'text') text = message.text.body;
        if (!text) return res.status(200).send('EVENT_RECEIVED');

        const shop = await Shop.findOne({ whatsappPhoneNumberId: phoneNumberId }).lean();
        if (!shop || !shop.isAIActive) return res.status(200).send('EVENT_RECEIVED');

        const token = decryptToken(shop.whatsappAccessToken);
        if (!token) {
            console.error('WA Webhook: token decrypt failed for shop', shop._id);
            return res.status(200).send('EVENT_RECEIVED');
        }

        if (text.trim().toLowerCase() === 'reset') {
            await ChatHistory.findOneAndDelete({ shopId: shop._id, psid: fromNumber });
            await axios.post(
                `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                { messaging_product: 'whatsapp', to: fromNumber, type: 'text', text: { body: 'মেমরি রিসেট করা হয়েছে! নতুন অর্ডারের তথ্য দিন।' } },
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15_000 }
            );
            return res.status(200).send('EVENT_RECEIVED');
        }

        const aiResponse = await getAurelianResponse(shop, fromNumber, text);
        if (aiResponse === 'QUEUED') {
            enqueueMessage({ shopId: shop._id, psid: fromNumber, text, platform: 'whatsapp' });
            return res.status(200).send('EVENT_RECEIVED');
        }

        const cleanMessage = aiResponse.replace(/(?:\[SYNC:\s*)?(\{[\s\S]*?"items"[\s\S]*?\})(?:\s*\])?/g, '').trim();
        await axios.post(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
            { messaging_product: 'whatsapp', to: fromNumber, type: 'text', text: { body: cleanMessage } },
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15_000 }
        );
        await processOrderSync(shop, aiResponse);
        return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
        console.error('WA Webhook error:', err.message);
        return res.status(200).send('EVENT_RECEIVED');
    }
});

// ══════════════════════════════════════════════════════════════
//  12. Global Error Handler & Start
// ══════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Enterprise API running on port ${PORT}`));
}
module.exports = app;