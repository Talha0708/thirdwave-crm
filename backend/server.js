/**
 * ============================================================
 * THIRDWAVE SAAS — Master Backend Server (Enterprise Scale)
 * Architecture: Manual-Auth | AES-256 Encrypted | Dynamic RPM
 * ============================================================
 */
'use strict';

require('dotenv').config();

// DNS Fix: Forces Google DNS to resolve MongoDB Atlas SRV records
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
app.use(helmet());

// ══════════════════════════════════════════════════════════════
//  0. AES-256 Encryption Logic (Enterprise Security)
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
        return hash; 
    }
}

// ══════════════════════════════════════════════════════════════
//  1. Middlewares & CORS
// ══════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

// ══════════════════════════════════════════════════════════════
//  2. Database Connection
// ══════════════════════════════════════════════════════════════
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 15_000,
            socketTimeoutMS:          45_000,
        });
        console.log('✅ MongoDB Connected (SaaS Ready - Encrypted)');
        await Shop.collection.createIndex({ metaPageId: 1 }, { background: true });
    } catch (err) {
        console.error('❌ DB Connection Error:', err.message);
        process.exit(1); 
    }
}
connectDB();

// ══════════════════════════════════════════════════════════════
//  3. Auth & Role Middlewares
// ══════════════════════════════════════════════════════════════
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Access denied' });

        req.user = jwt.verify(token, process.env.JWT_SECRET);

        const userDoc = await User.findById(req.user.id).select('isActive').lean();
        if (!userDoc?.isActive) return res.status(403).json({ error: 'Account suspended' });

        // 🔥 Admin এবং User উভয়ের জন্যই Shop ID খুঁজবে
        const shop = await Shop.findOne({ userId: req.user.id }).select('_id').lean();
        if (shop) req.shopId = shop._id;

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
//  4. Authentication & Magic Route
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        let isMatch = false;
        try { isMatch = await bcrypt.compare(password, user.password); } catch (_) {}
        if (!isMatch) isMatch = (password === user.password);

        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.isActive) return res.status(403).json({ error: 'Account suspended by admin' });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Login success:', email);
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// 🔥 Magic Route: Reset Admin & Assign a Shop for testing
app.get('/api/force-admin', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);
        const user = await User.findOneAndUpdate(
            { email: 'talha@gmail.com' },
            { name: 'Talha Admin', email: 'talha@gmail.com', password: hashedPassword, role: 'admin', isActive: true },
            { upsert: true, new: true }
        );
        await Shop.findOneAndUpdate(
            { userId: user._id },
            { shopName: 'Thirdwave HQ (Aurelian)', plan: 'Enterprise' },
            { upsert: true, new: true }
        );
        res.send('✅ Admin Account & Shop Reset Successful! Admin can now save tokens.');
    } catch (err) {
        res.send('❌ Error: ' + err.message);
    }
});

// ══════════════════════════════════════════════════════════════
//  5. Super Admin Routes
// ══════════════════════════════════════════════════════════════
app.post('/api/admin/create-client', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { name, email, password, shopName, plan } = req.body;
        const existing = await User.findOne({ email }).lean();
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });
        await Shop.create({ userId: user._id, shopName, plan: plan || 'Starter' });

        res.status(201).json({ message: 'Client created successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to create client', details: err.message });
    }
});

app.put('/api/admin/shops/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        shop.isActive = !shop.isActive;
        await shop.save();
        await User.findByIdAndUpdate(shop.userId, { isActive: shop.isActive });
        res.json({ message: `Shop is now ${shop.isActive ? 'Active' : 'Suspended'}`, isActive: shop.isActive });
    } catch (err) {
        res.status(500).json({ error: 'Toggle failed' });
    }
});

app.put('/api/admin/shops/:id/subscription', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { action, newPlan } = req.body;
        const shop = await Shop.findById(req.params.id);

        if (action === 'UPGRADE') {
            shop.plan = newPlan;
            shop.monthlyMessageCount = 0;
            shop.resetDate = new Date();
        } else if (action === 'RENEW') {
            shop.monthlyMessageCount = 0;
            shop.resetDate = new Date();
        }

        await shop.save();
        res.json({ message: `Shop updated: ${action}`, shop });
    } catch (err) {
        res.status(500).json({ error: 'Subscription update failed' });
    }
});

app.get('/api/admin/system-stats', authMiddleware, adminMiddleware, async (req, res) => {
    const [totalUsers, totalShops, activeShops] = await Promise.all([
        User.countDocuments({ role: 'user' }),
        Shop.countDocuments(),
        Shop.countDocuments({ isAIActive: true, isActive: true }),
    ]);
    res.json({ totalUsers, totalShops, activeShops });
});

app.get('/api/admin/shops', authMiddleware, adminMiddleware, async (req, res) => {
    const shops = await Shop.find().populate('userId', 'name email isActive').sort({ createdAt: -1 }).lean();
    res.json(shops);
});

// ══════════════════════════════════════════════════════════════
//  6. Client Dashboard & Integration Routes
// ══════════════════════════════════════════════════════════════
app.get('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.shopId).lean();
        res.json({
            isAIActive:   shop.isAIActive,
            systemPrompt: shop.systemPrompt,
            metaPageId:   shop.metaPageId,
            plan:         shop.plan,
            usage:        shop.monthlyMessageCount,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

app.put('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const { isAIActive, systemPrompt } = req.body;
        const update = {};
        if (typeof isAIActive !== 'undefined') update.isAIActive = isAIActive;
        if (typeof systemPrompt !== 'undefined') update.systemPrompt = systemPrompt;

        const shop = await Shop.findByIdAndUpdate(req.shopId, update, { new: true }).lean();
        res.json(shop);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// 🔥 THE NEW MANUAL INTEGRATION ROUTE (WITH SAFETY CHECK)
app.put('/api/shop/manual-facebook', authMiddleware, async (req, res) => {
    try {
        const { metaPageId, metaAccessToken } = req.body;
        
        if (!metaPageId || !metaAccessToken) {
            return res.status(400).json({ error: 'Page ID and Access Token are required' });
        }
        if (!req.shopId) {
            return res.status(400).json({ error: 'No Shop found! Please create a client account for yourself first.' });
        }

        const encryptedToken = encryptToken(metaAccessToken.trim());

        const shop = await Shop.findByIdAndUpdate(
            req.shopId, 
            { 
                metaPageId: metaPageId.trim(), 
                metaAccessToken: encryptedToken, 
                isAIActive: true 
            }, 
            { new: true }
        ).lean();

        console.log(`🔒 Encrypted & Saved Manual Token for Shop: ${shop.shopName}`);
        res.json({ message: 'Manual Facebook Integration Successful!' });
    } catch (err) {
        console.error('Manual Token Error:', err);
        res.status(500).json({ error: 'Failed to save manual token' });
    }
});

// Products & Orders
app.get('/api/products', authMiddleware, async (req, res) => { res.json(await Product.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean()); });
app.post('/api/products', authMiddleware, async (req, res) => { res.status(201).json(await Product.create({ ...req.body, shopId: req.shopId })); });
app.delete('/api/products/:id', authMiddleware, async (req, res) => { await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shopId }); res.json({ success: true }); });

app.get('/api/orders', authMiddleware, async (req, res) => { res.json({ orders: await Order.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean() }); });
app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
    const order = await Order.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, { status: req.body.status }, { new: true });
    res.json(order);
});

app.get('/api/analytics', authMiddleware, async (req, res) => {
    const [totalOrders, revenueAgg] = await Promise.all([
        Order.countDocuments({ shopId: req.shopId }),
        Order.aggregate([{ $match: { shopId: req.shopId } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
    ]);
    res.json({ totalOrders, totalRevenue: revenueAgg[0]?.total ?? 0 });
});

// ══════════════════════════════════════════════════════════════
//  7. AI Engine Logic (Gemini 3.1 Flash-Lite)
// ══════════════════════════════════════════════════════════════
const PLAN_LIMITS = {
    Starter:    { rpm: 5,  maxMessages: 3_000   },
    Business:   { rpm: 10, maxMessages: 8_000   },
    Enterprise: { rpm: 10, maxMessages: 999_999 },
};

const shopRPMTracker = Object.create(null);
const messageQueue = [];

function canProcessShopRPM(shopId, planRpm) {
    const id  = shopId.toString();
    const now = Date.now();

    if (!shopRPMTracker[id]) shopRPMTracker[id] = { count: 0, windowStart: now };
    const tracker = shopRPMTracker[id];

    if (now - tracker.windowStart >= 60_000) {
        tracker.windowStart = now;
        tracker.count = 0;
    }

    if (tracker.count >= planRpm) return false;
    tracker.count++;
    return true;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const SYNC_RE = /\[?SYNC:\s*(\{[\s\S]*?\})\s*\]?/;
const SIZES = new Set(['S', 'M', 'L', 'XL', 'XXL']);

async function getAurelianResponse(shop, psid, text, imgUrl = null, isFromQueue = false) {
    const limits = PLAN_LIMITS[shop.plan] ?? PLAN_LIMITS.Starter;

    if (!isFromQueue && !canProcessShopRPM(shop._id, limits.rpm)) return 'QUEUED';

    if (shop.monthlyMessageCount >= limits.maxMessages) {
        return 'আপনার পেজের মাসিক অটো-রিপ্লাই লিমিট শেষ হয়েছে। দয়া করে থার্ডওয়েভ CRM থেকে প্যাকেজ আপগ্রেড করুন। 🙏';
    }

   const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite', // 🔥 লেটেস্ট মডেল!
        systemInstruction: shop.systemPrompt,
    });

    let history = (await ChatHistory.findOne({ shopId: shop._id, psid }).lean())?.messages ?? [];
    history = history.map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: p.text })) }));
    const firstUserIdx = history.findIndex(m => m.role === 'user');
    if (firstUserIdx === -1) history = [];
    else {
        history = history.slice(firstUserIdx);
        if (history.at(-1)?.role === 'user') history.pop();
    }

    const chat  = model.startChat({ history });
    const parts = [];
    if (imgUrl) {
        try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30_000 });
            parts.push({
                inlineData: {
                    data: Buffer.from(res.data).toString('base64'),
                    mimeType: res.headers['content-type'] || 'image/jpeg',
                }
            });
        } catch(e) {}
    }
    parts.push({ text: text || 'Please look at this image.' });

    try {
        const result = await chat.sendMessage(parts);
        const aiText = result.response.text();

        await Shop.findByIdAndUpdate(shop._id, { $inc: { monthlyMessageCount: 1 } });
        await ChatHistory.updateOne(
            { shopId: shop._id, psid },
            { $push: { messages: { $each: [{ role: 'user', parts: [{ text: text || '[image]' }] }, { role: 'model', parts: [{ text: aiText }] }], $slice: -20 } } },
            { upsert: true }
        );

        return aiText;
   } catch (err) {
        console.error('\n🔴 Gemini API Error:', err.message); // 🔥 আসল এররটা টার্মিনালে দেখাবে
        if (err.message?.includes('429')) return 'বট ব্যস্ত আছে। একটু পর মেসেজ দিন। 🙏';
        return 'টেকনিক্যাল সমস্যা হচ্ছে। একটু পর মেসেজ দিন।';
    }
}

async function processOrderSync(shop, aiResponse) {
    const match = SYNC_RE.exec(aiResponse);
    if (!match) return;

    try {
        const data = JSON.parse(match[1]);
        const loc  = (data.l || '').toLowerCase();
        const isInsideDhaka = loc.includes('inside') || (loc.includes('dhaka') && !loc.includes('outside'));
        const sizeKey  = SIZES.has((data.s || 'M').toUpperCase()) ? (data.s || 'M').toUpperCase() : 'M';
        const prodName = (data.prod || '').toLowerCase();

        let namePattern = /panjabi/i;
        if (prodName.includes('polo')) namePattern = /polo/i;
        else if (prodName.includes('premium')) namePattern = /premium/i;

        let product = await Product.findOne({ shopId: shop._id, name: namePattern }) || await Product.findOne({ shopId: shop._id });
        if (!product) return;

        const deliveryCharge = isInsideDhaka ? 60 : 120;
        await Order.create({
            shopId:           shop._id,
            customerName:     (data.n || '').trim(),
            phoneNumber:      (data.p || '').trim(),
            address:          (data.a || '').trim(),
            productName:      `${data.prod} (Matched: ${product.name})`,
            productCode:      (data.c || data.prod || '').trim(),
            productSize:      sizeKey,
            deliveryLocation: isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka',
            deliveryCharge,
            totalPrice:       (product.price ?? 799) + deliveryCharge, // Fallback to your standard pricing
        });
    } catch (err) { console.error('Order sync error:', err.message); }
}

// ══════════════════════════════════════════════════════════════
//  8. Background Queue Worker
// ══════════════════════════════════════════════════════════════
setInterval(async () => {
    if (!messageQueue.length) return;

    for (let i = 0; i < messageQueue.length; i++) {
        const item   = messageQueue[i];
        const limits = PLAN_LIMITS[item.shop.plan] ?? PLAN_LIMITS.Starter;

        if (!canProcessShopRPM(item.shop._id, limits.rpm)) continue;

        messageQueue.splice(i, 1);
        i--;

        try {
            const aiResponse = await getAurelianResponse(item.shop, item.psid, item.text, item.imgUrl, true);
            if (aiResponse === 'QUEUED') { 
                messageQueue.push(item);
                continue;
            }

            const cleanMessage = aiResponse.replace(SYNC_RE, '').trim();
            const decryptedToken = decryptToken(item.shop.metaAccessToken);

            await axios.post(
                'https://graph.facebook.com/v19.0/me/messages',
                { recipient: { id: item.psid }, message: { text: cleanMessage } },
                { params: { access_token: decryptedToken } }
            );
            await processOrderSync(item.shop, aiResponse);
        } catch (err) { console.error('Queue error:', err.message); }
    }
}, 5_000);

// ══════════════════════════════════════════════════════════════
//  9. Multi-Tenant Webhook (WITH DEBUGGING CONSOLE LOGS)
// ══════════════════════════════════════════════════════════════
app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
        return res.status(200).send(req.query['hub.challenge']);
    }
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    res.sendStatus(200); 
    const body = req.body;
    
    // 🔥 Console log to track incoming requests from Facebook
    console.log('\n🔔 WEBHOOK HIT! Facebook is sending data...');

    if (body.object !== 'page') return;

    try {
        const pageId = body.entry?.[0]?.id;
        const shop = await Shop.findOne({ metaPageId: pageId });

        if (!shop) {
            console.log(`❌ Error: No shop found in Database for Page ID: ${pageId}`);
            return;
        }
        if (!shop.isAIActive) {
            console.log(`⏸️ AI is paused for shop: ${shop.shopName}`);
            return;
        }

        const messaging = body.entry?.[0]?.messaging?.[0];
        if (!messaging) return;

        const psid   = messaging.sender?.id;
        const text   = messaging.message?.text;
        const imgUrl = messaging.message?.attachments?.[0]?.payload?.url;
        
        console.log(`💬 New Message from PSID [${psid}]: ${text || '[Image]'}`);
        
        if (!psid || (!text && !imgUrl)) return;

        const aiResponse = await getAurelianResponse(shop, psid, text, imgUrl);
        if (aiResponse === 'QUEUED') {
            console.log('⏳ Message Queued due to Rate Limit...');
            messageQueue.push({ shop, psid, text, imgUrl });
            return;
        }

        const cleanMessage = aiResponse.replace(SYNC_RE, '').trim();
        const decryptedToken = decryptToken(shop.metaAccessToken);

        await axios.post(
            'https://graph.facebook.com/v19.0/me/messages',
            { recipient: { id: psid }, message: { text: cleanMessage } },
            { params: { access_token: decryptedToken } }
        );
        
        console.log('✅ AI Reply Sent Successfully!');
        await processOrderSync(shop, aiResponse);
    } catch (err) { 
        console.error('❌ Webhook error:', err.message); 
    }
});

// ══════════════════════════════════════════════════════════════
//  10. Global Error Handler & Start
// ══════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Thirdwave SaaS API running on port ${PORT}`));