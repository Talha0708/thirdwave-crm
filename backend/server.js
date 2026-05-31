/**
 * ============================================================
 * THIRDWAVE SAAS — Master Backend Server (Vercel Serverless Optimized)
 * Architecture: Meta Webhook + WhatsApp Cloud API + Gemini AI + Multi-Item Cart
 * Version: 3.0.0 — Enterprise Grade (CORS Fixed & Vercel Optimized)
 * ============================================================
 */
'use strict';

require('dotenv').config();

// ── DNS Fix: Forces Google DNS to resolve MongoDB Atlas SRV records ──
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express   = require('express');
const mongoose  = require('mongoose');
const axios     = require('axios');
const cors      = require('cors');
const helmet    = require('helmet');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { User, Shop, Product, Order, ChatHistory } = require('./models');

// ──────────────────────────────────────────────────────────────
//  Environment Validation — Fail fast if critical vars missing
// ──────────────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'GEMINI_API_KEY', 'META_VERIFY_TOKEN'];
const missingEnv   = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
    console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const app = express();

// Vercel proxy trust — must be set before any rate limiter
app.set('trust proxy', 1);

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ══════════════════════════════════════════════════════════════
//  0. AES-256 Encryption (Enterprise Security)
// ══════════════════════════════════════════════════════════════
const ALGORITHM      = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET, 'thirdwave_salt_v2', 32);

function encryptToken(text) {
    if (!text) return text;
    const iv     = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    return `${iv.toString('hex')}:${cipher.update(text, 'utf8', 'hex')}${cipher.final('hex')}`;
}

function decryptToken(hash) {
    if (!hash) return null;
    try {
        if (!hash.includes(':')) return hash; // plain token fallback
        const [ivHex, ...rest] = hash.split(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
        return `${decipher.update(rest.join(':'), 'hex', 'utf8')}${decipher.final('utf8')}`;
    } catch (e) {
        console.error('❌ Decryption failed:', e.message);
        return hash;
    }
}

// ══════════════════════════════════════════════════════════════
//  1. CORS & Body Parsing (✅ CORS FULLY OPENED FOR NO ERRORS)
// ══════════════════════════════════════════════════════════════
app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins to bypass CORS issues on Vercel
        callback(null, true);
    },
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── API Rate Limiter ──
const ipKeyGen = (req) =>
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';

app.use('/api/', rateLimit({
    windowMs:       60_000,
    max:            200,
    standardHeaders: true,
    legacyHeaders:  false,
    keyGenerator:   ipKeyGen,
    handler:        (_req, res) => res.status(429).json({ error: 'Too many requests. Please slow down.' }),
}));

// ── Webhook stricter limiter ──
app.use('/webhook', rateLimit({
    windowMs:    10_000,
    max:         100,
    keyGenerator: ipKeyGen,
    handler:     (_req, res) => res.sendStatus(429),
}));

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  2. Database Connection (Serverless Singleton)
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  2. Database Connection (Serverless Singleton)
// ══════════════════════════════════════════════════════════════
let dbPromise = null;

async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    if (dbPromise) return dbPromise;

    dbPromise = mongoose.connect(process.env.MONGO_URI, {
        family:                    4,
        serverSelectionTimeoutMS:  15_000,
        socketTimeoutMS:           45_000,
        maxPoolSize:               10,
    }).then(async () => {
        console.log('✅ MongoDB Connected');
        await Promise.all([
            Shop.collection.createIndex({ metaPageId: 1 },            { background: true }),
            Shop.collection.createIndex({ whatsappPhoneNumberId: 1 }, { background: true }),
            Shop.collection.createIndex({ userId: 1 },                { background: true }),
            Order.collection.createIndex({ shopId: 1, createdAt: -1 }, { background: true }),
            // ✅ FIX: ডাটাবেসের সাথে ম্যাচ করানোর জন্য unique: true অ্যাড করা হয়েছে
            Product.collection.createIndex({ shopId: 1, code: 1 },    { unique: true, background: true }),
            ChatHistory.collection.createIndex({ shopId: 1, psid: 1 }, { background: true }),
        ]);
    }).catch(err => {
        dbPromise = null;
        console.error('❌ DB Connection Error:', err.message);
        throw err;
    });

    return dbPromise;
}

// ══════════════════════════════════════════════════════════════
//  3. Auth Middleware
// ══════════════════════════════════════════════════════════════
const authMiddleware = async (req, res, next) => {
    try {
        await connectDB();

        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Access denied — no token provided' });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.user = decoded;

        const [userDoc, shop] = await Promise.all([
            User.findById(req.user.id).select('isActive').lean(),
            Shop.findOne({ userId: req.user.id }).select('_id').lean(),
        ]);

        if (!userDoc)         return res.status(401).json({ error: 'User not found' });
        if (!userDoc.isActive) return res.status(403).json({ error: 'Account suspended' });

        if (shop) req.shopId = shop._id;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        res.status(500).json({ error: 'Authentication error' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

// ══════════════════════════════════════════════════════════════
//  4. Input Validation Helpers
// ══════════════════════════════════════════════════════════════
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v) => /^\+?[0-9]{7,15}$/.test(v);

function sanitizeString(v, maxLen = 500) {
    if (typeof v !== 'string') return '';
    return v.trim().slice(0, maxLen);
}

// ══════════════════════════════════════════════════════════════
//  5. Auth Routes
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
    try {
        await connectDB();
        const { email, password } = req.body;

        if (!email || !password)         return res.status(400).json({ error: 'Email and password required' });
        if (!isValidEmail(email.trim())) return res.status(400).json({ error: 'Invalid email format' });

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password).catch(() => false)
                     || password === user.password;

        if (!isMatch)      return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.isActive) return res.status(403).json({ error: 'Account suspended by admin' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ══════════════════════════════════════════════════════════════
//  6. Admin Routes
// ══════════════════════════════════════════════════════════════
app.post('/api/admin/create-client', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { name, email, password, shopName, plan } = req.body;
        if (!name || !email || !password || !shopName) return res.status(400).json({ error: 'name, email, password, shopName are required' });
        if (!isValidEmail(email))                       return res.status(400).json({ error: 'Invalid email format' });
        if (password.length < 8)                        return res.status(400).json({ error: 'Password must be at least 8 characters' });

        const VALID_PLANS = ['Starter', 'Business', 'Enterprise'];
        const selectedPlan = VALID_PLANS.includes(plan) ? plan : 'Starter';

        const existing = await User.findOne({ email: email.toLowerCase() }).lean();
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashedPassword });
        await Shop.create({ userId: user._id, shopName: shopName.trim(), plan: selectedPlan });

        res.status(201).json({ message: 'Client created successfully' });
    } catch (err) {
        console.error('Create client error:', err.message);
        res.status(500).json({ error: 'Failed to create client', details: err.message });
    }
});

app.put('/api/admin/shops/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        shop.isActive = !shop.isActive;
        await Promise.all([
            shop.save(),
            User.findByIdAndUpdate(shop.userId, { isActive: shop.isActive }),
        ]);
        res.json({ message: `Shop is now ${shop.isActive ? 'Active' : 'Suspended'}`, isActive: shop.isActive });
    } catch (err) {
        console.error('Toggle error:', err.message);
        res.status(500).json({ error: 'Toggle failed' });
    }
});

app.put('/api/admin/shops/:id/subscription', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { action, newPlan } = req.body;
        const VALID_PLANS   = ['Starter', 'Business', 'Enterprise'];
        const VALID_ACTIONS = ['UPGRADE', 'RENEW'];

        if (!VALID_ACTIONS.includes(action)) return res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
        if (action === 'UPGRADE' && !VALID_PLANS.includes(newPlan)) return res.status(400).json({ error: `newPlan must be one of: ${VALID_PLANS.join(', ')}` });

        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        if (action === 'UPGRADE') shop.plan = newPlan;
        shop.monthlyMessageCount = 0;
        shop.resetDate           = new Date();
        await shop.save();

        res.json({ message: `Shop ${action} successful`, shop });
    } catch (err) {
        console.error('Subscription update error:', err.message);
        res.status(500).json({ error: 'Subscription update failed' });
    }
});

app.get('/api/admin/system-stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [totalUsers, totalShops, activeShops, totalOrders, revenueAgg] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Shop.countDocuments(),
            Shop.countDocuments({ isAIActive: true, isActive: true }),
            Order.countDocuments(),
            Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
        ]);
        res.json({
            totalUsers,
            totalShops,
            activeShops,
            totalOrders,
            totalRevenue: revenueAgg[0]?.total ?? 0,
        });
    } catch (err) {
        console.error('System stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

app.get('/api/admin/shops', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shops = await Shop.find()
            .populate('userId', 'name email isActive')
            .sort({ createdAt: -1 })
            .lean();
        res.json(shops);
    } catch (err) {
        console.error('Admin shops error:', err.message);
        res.status(500).json({ error: 'Failed to fetch shops' });
    }
});

// ══════════════════════════════════════════════════════════════
//  7. Shop Config Routes
// ══════════════════════════════════════════════════════════════
app.get('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.shopId).lean();
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        res.json({
            isAIActive:           shop.isAIActive,
            systemPrompt:         shop.systemPrompt,
            metaPageId:           shop.metaPageId,
            whatsappPhoneNumberId: shop.whatsappPhoneNumberId,
            plan:                 shop.plan,
            usage:                shop.monthlyMessageCount,
        });
    } catch (err) {
        console.error('Shop config error:', err.message);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

app.put('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const update = {};
        if (typeof req.body.isAIActive  !== 'undefined') update.isAIActive  = Boolean(req.body.isAIActive);
        if (typeof req.body.systemPrompt !== 'undefined') update.systemPrompt = sanitizeString(req.body.systemPrompt, 5000);

        const shop = await Shop.findByIdAndUpdate(req.shopId, update, { new: true }).lean();
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        res.json(shop);
    } catch (err) {
        console.error('Shop config update error:', err.message);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

app.put('/api/shop/manual-facebook', authMiddleware, async (req, res) => {
    try {
        const { metaPageId, metaAccessToken } = req.body;
        if (!metaPageId || !metaAccessToken) return res.status(400).json({ error: 'Page ID and Access Token are required' });

        const encryptedToken = encryptToken(metaAccessToken.trim());
        await Shop.findByIdAndUpdate(req.shopId, {
            metaPageId:      metaPageId.trim(),
            metaAccessToken: encryptedToken,
            isAIActive:      true,
        });
        res.json({ message: 'Facebook integration successful!' });
    } catch (err) {
        console.error('Manual FB error:', err.message);
        res.status(500).json({ error: 'Failed to save Facebook token' });
    }
});

app.put('/api/shop/manual-whatsapp', authMiddleware, async (req, res) => {
    try {
        const { whatsappPhoneNumberId, whatsappAccessToken } = req.body;
        if (!whatsappPhoneNumberId || !whatsappAccessToken) return res.status(400).json({ error: 'Phone Number ID and Access Token are required' });

        const encryptedToken = encryptToken(whatsappAccessToken.trim());
        await Shop.findByIdAndUpdate(req.shopId, {
            whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
            whatsappAccessToken:   encryptedToken,
            isAIActive:            true,
        });
        res.json({ message: 'WhatsApp integration successful!' });
    } catch (err) {
        console.error('Manual WA error:', err.message);
        res.status(500).json({ error: 'Failed to save WhatsApp token' });
    }
});

// ══════════════════════════════════════════════════════════════
//  8. Products & Orders Routes
// ══════════════════════════════════════════════════════════════
app.get('/api/products', authMiddleware, async (req, res) => {
    try {
        const products = await Product.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', authMiddleware, async (req, res) => {
    try {
        const { name, code, price, description } = req.body;
        if (!name || !code)              return res.status(400).json({ error: 'Product name and code are required' });
        if (isNaN(price) || price < 0)  return res.status(400).json({ error: 'Invalid price' });

        const exists = await Product.findOne({ shopId: req.shopId, code: code.trim().toUpperCase() }).lean();
        if (exists) return res.status(409).json({ error: 'Product code already exists in this shop' });

        const product = await Product.create({
            shopId:      req.shopId,
            name:        sanitizeString(name),
            code:        code.trim().toUpperCase(),
            price:       Number(price),
            description: sanitizeString(description || '', 1000),
        });
        res.status(201).json(product);
    } catch (err) {
        console.error('Create product error:', err.message);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
    try {
        const allowedFields = ['name', 'price', 'description', 'stock', 'isActive'];
        const update = {};
        allowedFields.forEach(f => {
            if (typeof req.body[f] !== 'undefined') update[f] = req.body[f];
        });
        if (update.price !== undefined && (isNaN(update.price) || update.price < 0)) {
            return res.status(400).json({ error: 'Invalid price' });
        }
        if (update.name) update.name = sanitizeString(update.name);

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, shopId: req.shopId },
            update,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('Update product error:', err.message);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
    try {
        const result = await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
        if (!result) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 50, status } = req.query;
        const filter = { shopId: req.shopId };
        if (status) filter.status = status;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit))
                .lean(),
            Order.countDocuments(filter),
        ]);
        res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        console.error('Fetch orders error:', err.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
    try {
        const VALID_STATUS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        const { status } = req.body;
        if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` });

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, shopId: req.shopId },
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

app.get('/api/analytics', authMiddleware, async (req, res) => {
    try {
        const [totalOrders, revenueAgg, pendingOrders, deliveredOrders] = await Promise.all([
            Order.countDocuments({ shopId: req.shopId }),
            Order.aggregate([
                { $match: { shopId: req.shopId } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } },
            ]),
            Order.countDocuments({ shopId: req.shopId, status: 'Pending' }),
            Order.countDocuments({ shopId: req.shopId, status: 'Delivered' }),
        ]);
        res.json({
            totalOrders,
            totalRevenue:    revenueAgg[0]?.total ?? 0,
            pendingOrders,
            deliveredOrders,
        });
    } catch (err) {
        console.error('Analytics error:', err.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ══════════════════════════════════════════════════════════════
//  9. AI Engine — Gemini 3.1 Flash-Lite
// ══════════════════════════════════════════════════════════════
const PLAN_LIMITS = {
    Starter:    { rpm: 20, maxMessages: 3_000   },
    Business:   { rpm: 40, maxMessages: 8_000   },
    Enterprise: { rpm: 60, maxMessages: 999_999 },
};

const shopRPMTracker = Object.create(null);

function canProcessShopRPM(shopId, planRpm) {
    const id  = shopId.toString();
    const now = Date.now();
    if (!shopRPMTracker[id]) shopRPMTracker[id] = { count: 0, windowStart: now };

    const t = shopRPMTracker[id];
    if (now - t.windowStart >= 60_000) { t.windowStart = now; t.count = 0; }
    if (t.count >= planRpm) return false;

    t.count++;
    return true;
}

const SYNC_RE = /\[SYNC:\s*(\{[\s\S]*\})\s*\]/;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const messageQueue = [];

async function getAurelianResponse(shop, psid, text, imgUrl = null, isFromQueue = false) {
    const limits = PLAN_LIMITS[shop.plan] ?? PLAN_LIMITS.Starter;

    if (!isFromQueue && !canProcessShopRPM(shop._id, limits.rpm)) return 'QUEUED';

    if (shop.monthlyMessageCount >= limits.maxMessages) {
        return 'আপনার পেজের মাসিক অটো-রিপ্লাই লিমিট শেষ হয়েছে। দয়া করে থার্ডওয়েভ CRM থেকে প্যাকেজ আপগ্রেড করুন। 🙏';
    }

    const model = genAI.getGenerativeModel({
        model:           'gemini-3.1-flash-lite',
        systemInstruction: shop.systemPrompt,
        generationConfig:  { maxOutputTokens: 1024, temperature: 0.7 },
    });

    const raw = (await ChatHistory.findOne({ shopId: shop._id, psid }).select('messages').lean())?.messages ?? [];
    let history = raw.map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: p.text })) }));
    const firstUserIdx = history.findIndex(m => m.role === 'user');
    history = firstUserIdx === -1 ? [] : history.slice(firstUserIdx);
    if (history.length && history.at(-1).role === 'user') history.pop();

    const chat  = model.startChat({ history });
    const parts = [];

    if (imgUrl) {
        try {
            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30_000 });
            parts.push({
                inlineData: {
                    data:     Buffer.from(imgRes.data).toString('base64'),
                    mimeType: imgRes.headers['content-type'] || 'image/jpeg',
                },
            });
        } catch (e) {
            console.warn('⚠️ Image fetch failed:', e.message);
        }
    }
    parts.push({ text: text || 'Please look at this image.' });

    try {
        const result = await chat.sendMessage(parts);
        const aiText = result.response.text();

        await Promise.all([
            Shop.findByIdAndUpdate(shop._id, { $inc: { monthlyMessageCount: 1 } }),
            ChatHistory.updateOne(
                { shopId: shop._id, psid },
                {
                    $push: {
                        messages: {
                            $each:  [
                                { role: 'user',  parts: [{ text: text || '[image]' }] },
                                { role: 'model', parts: [{ text: aiText }] },
                            ],
                            $slice: -20,
                        },
                    },
                },
                { upsert: true }
            ),
        ]);

        return aiText;
    } catch (err) {
        console.error('🔴 Gemini API Error:', err.message);
        if (err.message?.includes('429')) return 'বট এখন ব্যস্ত আছে। একটু পরে মেসেজ দিন। 🙏';
        return 'টেকনিক্যাল সমস্যা হচ্ছে। একটু পরে মেসেজ দিন।';
    }
}

// ══════════════════════════════════════════════════════════════
//  10. JSON Repair + Order Sync
// ══════════════════════════════════════════════════════════════
function repairJson(raw) {
    return raw.trim()
        .replace(/```json|```/g, '')
        .trim()
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\x00-\x1F\x7F]/g, ' ');
}

async function processOrderSync(shop, aiResponse) {
    const match = SYNC_RE.exec(aiResponse);
    if (!match) return;

    const rawJson = match[1];
    let data;

    try {
        data = JSON.parse(rawJson);
    } catch {
        try {
            data = JSON.parse(repairJson(rawJson));
            console.log('✅ JSON repaired successfully');
        } catch (repairErr) {
            console.error('❌ JSON repair failed. Raw:', rawJson.slice(0, 200));
            console.error('   Error:', repairErr.message);
            return;
        }
    }

    const loc            = (data.l || '').toLowerCase().trim();
    const isInsideDhaka  = loc.includes('inside') || (loc.includes('dhaka') && !loc.includes('outside'));
    const deliveryCharge = isInsideDhaka ? 60 : 120;

    let finalTotal       = deliveryCharge;
    const processedItems = [];

    if (Array.isArray(data.items)) {
        for (const item of data.items) {
            const code = (item.c || '').trim().toUpperCase();
            if (!code) continue;

            const product = await Product.findOne({ shopId: shop._id, code }).lean();
            if (!product) {
                console.warn(`⚠️  No product for code "${code}"`);
                continue;
            }

            const qty      = Math.max(1, parseInt(item.qty) || 1);
            const subTotal = product.price * qty;
            finalTotal    += subTotal;

            processedItems.push({
                productCode: product.code,
                productName: product.name,
                size:        sanitizeString(item.s     || 'FREE SIZE', 50),
                color:       sanitizeString(item.color || '',          50),
                quantity:    qty,
                unitPrice:   product.price,
                subTotal,
            });
        }
    }

    if (!processedItems.length) {
        console.warn('⚠️ Order Sync skipped — no valid products matched');
        return;
    }

    const phone = (data.p || '').trim();
    if (!isValidPhone(phone) && phone !== 'Unknown') {
        console.warn(`⚠️ Suspicious phone number "${phone}" — saving anyway`);
    }

    await Order.create({
        shopId:           shop._id,
        customerName:     sanitizeString(data.n || 'Unknown', 100),
        phoneNumber:      sanitizeString(phone  || 'Unknown', 20),
        address:          sanitizeString(data.a || 'Unknown', 300),
        items:            processedItems,
        deliveryLocation: isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka',
        deliveryCharge,
        totalPrice:       finalTotal,
        status:           'Pending',
    });

    console.log(`✅ Order Synced! Items: ${processedItems.length} | Total: ৳${finalTotal}`);
}

// ══════════════════════════════════════════════════════════════
//  11. Message Send Helpers
// ══════════════════════════════════════════════════════════════
async function sendFacebookMessage(shop, recipientId, text) {
    const token = decryptToken(shop.metaAccessToken);
    try {
        await axios.post(
            'https://graph.facebook.com/v19.0/me/messages',
            {
                messaging_type: 'RESPONSE',
                recipient:      { id: recipientId },
                message:        { text },
            },
            { params: { access_token: token } }
        );
    } catch (err) {
        const fbError = err.response?.data ?? err.message;
        console.error('❌ FB Send Error:', JSON.stringify(fbError, null, 2));
        throw err;
    }
}

async function sendWhatsAppMessage(shop, to, text) {
    const token = decryptToken(shop.whatsappAccessToken);
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${shop.whatsappPhoneNumberId}/messages`,
            { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        const waError = err.response?.data ?? err.message;
        console.error('❌ WA Send Error:', JSON.stringify(waError, null, 2));
        throw err;
    }
}

// ══════════════════════════════════════════════════════════════
//  12. Queue Worker
// ══════════════════════════════════════════════════════════════
setInterval(async () => {
    if (!messageQueue.length) return;

    for (let i = 0; i < messageQueue.length; i++) {
        const item = messageQueue[i];
        let freshShop;
        try {
            freshShop = await Shop.findById(item.shopId);
        } catch {
            messageQueue.splice(i--, 1);
            continue;
        }

        if (!freshShop?.isAIActive) { messageQueue.splice(i--, 1); continue; }

        const limits = PLAN_LIMITS[freshShop.plan] ?? PLAN_LIMITS.Starter;
        if (!canProcessShopRPM(freshShop._id, limits.rpm)) continue;

        messageQueue.splice(i--, 1);

        try {
            const aiResponse = await getAurelianResponse(freshShop, item.psid, item.text, item.imgUrl, true);
            if (aiResponse === 'QUEUED') { messageQueue.push(item); continue; }

            const cleanMessage = aiResponse.replace(SYNC_RE, '').trim();

            if (item.platform === 'whatsapp') {
                await sendWhatsAppMessage(freshShop, item.psid, cleanMessage);
            } else {
                await sendFacebookMessage(freshShop, item.psid, cleanMessage);
            }

            await processOrderSync(freshShop, aiResponse);
        } catch (err) {
            const qErr = err.response?.data ?? err.message;
            console.error('❌ Queue worker error:', JSON.stringify(qErr, null, 2));
        }
    }
}, 5_000);

// ══════════════════════════════════════════════════════════════
//  13. Facebook Messenger Webhook (✅ SERVERLESS FREEZE FIXED)
// ══════════════════════════════════════════════════════════════
app.get('/webhook', (req, res) => {
    if (
        req.query['hub.mode']         === 'subscribe' &&
        req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN
    ) return res.status(200).send(req.query['hub.challenge']);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    console.log('\n🔔 FB WEBHOOK HIT!');

    try {
        await connectDB();
        const body = req.body;

        if (body.object !== 'page') {
            console.log('⚠️ Not a page event.');
            return res.status(200).send('EVENT_RECEIVED');
        }

        const pageId = body.entry?.[0]?.id;
        const shop = await Shop.findOne({ metaPageId: pageId }).lean();

        if (!shop || !shop.isAIActive) {
            console.log(`⚠️ Shop not found or AI OFF for Page ID: ${pageId}`);
            return res.status(200).send('EVENT_RECEIVED');
        }

        const messaging = body.entry?.[0]?.messaging?.[0];
        if (!messaging || messaging.message?.is_echo) {
            return res.status(200).send('EVENT_RECEIVED');
        }

        const psid   = messaging.sender?.id;
        const text   = messaging.message?.text || '';
        const imgUrl = messaging.message?.attachments?.[0]?.payload?.url || null;

        if (!psid || (!text && !imgUrl)) {
            return res.status(200).send('EVENT_RECEIVED');
        }

        console.log(`💬 User (${psid}) sent: "${text}"`);

        const aiResponse = await getAurelianResponse(shop, psid, text, imgUrl);
        
        if (aiResponse === 'QUEUED') {
            console.log('⏳ Message Queued due to limits.');
            messageQueue.push({ shopId: shop._id, psid, text, imgUrl, platform: 'facebook' });
            return res.status(200).send('EVENT_RECEIVED');
        }

        const cleanMessage = aiResponse.replace(SYNC_RE, '').trim();
        await sendFacebookMessage(shop, psid, cleanMessage);
        await processOrderSync(shop, aiResponse);
        console.log('✅ FB Reply Sent!');

        // ✅ Vercel e function jeno age theme na jay, tai ekdom sheshe res.send()
        return res.status(200).send('EVENT_RECEIVED');

    } catch (err) {
        const fbError = err.response?.data ?? err.message;
        console.error('❌ FB Webhook error:', JSON.stringify(fbError, null, 2));
        return res.status(200).send('EVENT_RECEIVED');
    }
});

// ══════════════════════════════════════════════════════════════
//  14. WhatsApp Cloud API Webhook
// ══════════════════════════════════════════════════════════════
app.get('/webhook/whatsapp', (req, res) => {
    if (
        req.query['hub.mode']         === 'subscribe' &&
        req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN
    ) return res.status(200).send(req.query['hub.challenge']);
    res.sendStatus(403);
});

app.post('/webhook/whatsapp', async (req, res) => {
    console.log('\n📱 WA WEBHOOK HIT!');

    try {
        await connectDB();
        const body = req.body;

        if (body.object !== 'whatsapp_business_account') return res.status(200).send('EVENT_RECEIVED');

        const changes = body.entry?.[0]?.changes?.[0]?.value;
        if (!changes?.messages?.[0]) return res.status(200).send('EVENT_RECEIVED');

        const phoneNumberId = changes.metadata.phone_number_id;
        const message       = changes.messages[0];
        const fromNumber    = message.from;

        const shop = await Shop.findOne({ whatsappPhoneNumberId: phoneNumberId }).lean();
        if (!shop || !shop.isAIActive) return res.status(200).send('EVENT_RECEIVED');

        let text   = '';
        let imgUrl = null;

        if (message.type === 'text') {
            text = message.text?.body || '';
        } else if (message.type === 'image' && message.image?.id) {
            try {
                const mediaRes = await axios.get(
                    `https://graph.facebook.com/v19.0/${message.image.id}`,
                    { headers: { Authorization: `Bearer ${decryptToken(shop.whatsappAccessToken)}` } }
                );
                imgUrl = mediaRes.data?.url || null;
            } catch (e) {
                console.warn('⚠️ WA image fetch failed:', e.message);
            }
        }

        if (!text && !imgUrl) return res.status(200).send('EVENT_RECEIVED');

        const aiResponse = await getAurelianResponse(shop, fromNumber, text, imgUrl);

        if (aiResponse === 'QUEUED') {
            messageQueue.push({ shopId: shop._id, psid: fromNumber, text, imgUrl, platform: 'whatsapp' });
            return res.status(200).send('EVENT_RECEIVED');
        }

        const cleanMessage = aiResponse.replace(SYNC_RE, '').trim();
        await sendWhatsAppMessage(shop, fromNumber, cleanMessage);
        await processOrderSync(shop, aiResponse);
        console.log('✅ WA Reply Sent!');

        return res.status(200).send('EVENT_RECEIVED');

    } catch (err) {
        const waError = err.response?.data ?? err.message;
        console.error('❌ WA Webhook error:', JSON.stringify(waError, null, 2));
        return res.status(200).send('EVENT_RECEIVED');
    }
});

// ══════════════════════════════════════════════════════════════
//  15. Health Check
// ══════════════════════════════════════════════════════════════
app.get('/health', async (_req, res) => {
    const dbState = mongoose.connection.readyState;
    res.json({
        status:  'ok',
        db:      ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
        queue:   messageQueue.length,
        uptime:  Math.floor(process.uptime()),
        version: '3.0.0',
    });
});

// ══════════════════════════════════════════════════════════════
//  16. Global Error Handler & 404
// ══════════════════════════════════════════════════════════════
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ══════════════════════════════════════════════════════════════
//  17. Bootstrap
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Thirdwave SaaS API v3.0.0 running on port ${PORT}`);
    try { await connectDB(); } catch (_) {}
});

module.exports = app;