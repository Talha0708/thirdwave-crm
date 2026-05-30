/**
 * ============================================================
 * THIRDWAVE SAAS — Enterprise Master Server (Vercel Ready)
 * Architecture: Auto OAuth + WhatsApp + Dynamic Rate Limiting + Gemini AI
 * Core Features: Multi-Item Ordering, Token Encryption, Safe Fallbacks
 * ============================================================
 */
'use strict';
require('dotenv').config();

// DNS Resolution Fix for Serverless Lambda Environments (Forces Google DNS)
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

// Reverse Proxy Trust for Vercel Edge Router to fetch accurate client IPs
app.set('trust proxy', 1);
app.use(helmet());

// ══════════════════════════════════════════════════════════════
//  0. AES-256-CBC Encryption Engine (Token Hardening)
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
        console.error('❌ Decryption process critical error:', e.message);
        return null;
    }
}

// ══════════════════════════════════════════════════════════════
//  1. Global Middlewares & CORS Topologies
// ══════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Cross-Origin Resource Sharing block by Thirdwave Gate'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));

// Route-specific parser guards to handle raw stream data during signature evaluation
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook/whatsapp', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// Express global protection limits
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
    message: { error: 'Inundation risk: Provisioning requests limited.' },
});

// ══════════════════════════════════════════════════════════════
//  2. Database Connection Orchestration (Serverless Safe)
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
        console.log('✅ Enterprise MongoDB Connected Core');
        await Shop.collection.createIndex({ metaPageId: 1 }, { background: true });
        await Shop.collection.createIndex({ whatsappPhoneNumberId: 1 }, { background: true });
    } catch (err) {
        console.error('❌ Database bootstrapping failed:', err.message);
        throw err;
    }
}

// ══════════════════════════════════════════════════════════════
//  3. Authentication Guard Railings
// ══════════════════════════════════════════════════════════════
const authMiddleware = async (req, res, next) => {
    await connectDB();
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Access denied: Token absent' });
        
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        const userDoc = await User.findById(req.user.id).select('isActive').lean();
        
        if (!userDoc?.isActive) return res.status(403).json({ error: 'Account suspended by core administrator' });
        
        const shop = await Shop.findOne({ userId: req.user.id }).select('_id').lean();
        if (shop) {
            req.shopId = shop._id;
        } else if (req.user.role !== 'admin') {
            return res.status(404).json({ error: 'Tenant profile resolution failed' });
        }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Session manipulation detected: invalid signature' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Elevated admin context required' });
    next();
};

// ══════════════════════════════════════════════════════════════
//  4. Auth & Admin Core Endpoints
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Credentials criteria incomplete' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Security evaluation failed: mismatch' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Security evaluation failed: mismatch' });

        if (!user.isActive) return res.status(403).json({ error: 'Access restricted: Account freeze state active' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Internal pipeline breakdown' });
    }
});

app.post('/api/admin/create-client', authMiddleware, adminMiddleware, adminCreateLimiter, async (req, res) => {
    try {
        const { name, email, password, shopName, plan } = req.body;
        if (!name || !email || !password || !shopName) return res.status(400).json({ error: 'Required attributes field missing' });

        const existing = await User.findOne({ email }).lean();
        if (existing) return res.status(409).json({ error: 'Identifier collision: email already mapped' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, password: hashedPassword });
        await Shop.create({ userId: user._id, shopName, plan: plan || 'Starter' });
        res.status(201).json({ message: 'SaaS Instance provisioned successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Allocation failed inside engine pipeline' });
    }
});

app.put('/api/admin/shops/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Target instance not discovered' });
        
        shop.isActive = !shop.isActive;
        await shop.save();
        await User.findByIdAndUpdate(shop.userId, { isActive: shop.isActive });
        res.json({ message: `Instance mutation complete. Active state: ${shop.isActive}`, isActive: shop.isActive });
    } catch (err) {
        res.status(500).json({ error: 'Instance mutation execution failure' });
    }
});

app.put('/api/admin/shops/:id/subscription', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { action, newPlan } = req.body;
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Target instance not discovered' });

        if (action === 'UPGRADE') {
            if (!PLAN_LIMITS[newPlan]) return res.status(400).json({ error: 'Target operational tier invalid' });
            shop.plan = newPlan;
            shop.monthlyMessageCount = 0;
            shop.resetDate = new Date();
        } else if (action === 'RENEW') {
            shop.monthlyMessageCount = 0;
            shop.resetDate = new Date();
        } else {
            return res.status(400).json({ error: 'Execution step command rejected' });
        }
        await shop.save();
        res.json({ message: `Billing mutation completed successfully: ${action}`, shop });
    } catch (err) {
        res.status(500).json({ error: 'Billing model rewrite trace failure' });
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
        res.status(500).json({ error: 'Telemetry data resolution failure' });
    }
});

app.get('/api/admin/shops', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const shops = await Shop.find().populate('userId', 'name email isActive').sort({ createdAt: -1 }).lean();
        res.json(shops);
    } catch (err) {
        res.status(500).json({ error: 'Tenant record retrieval process failed' });
    }
});

// ══════════════════════════════════════════════════════════════
//  5. Meta Channel Settings & Integrations
// ══════════════════════════════════════════════════════════════
app.post('/api/shop/oauth/facebook', authMiddleware, async (req, res) => {
    try {
        const { accessToken, pageId } = req.body;
        if (!accessToken || !pageId) return res.status(400).json({ error: 'Integrations criteria unfulfilled' });

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
        if (!longLivedUserToken) throw new Error('Long-Lived context token exchange failed');

        const pageResponse = await axios.get(`https://graph.facebook.com/v19.0/${pageId}`, {
            params: { fields: 'access_token', access_token: longLivedUserToken },
            timeout: 15_000,
        });
        const pageToken = pageResponse.data.access_token;
        if (!pageToken) throw new Error('Target Page context execution key missing');

        const encryptedToken = encryptToken(pageToken);
        await Shop.findByIdAndUpdate(req.shopId, {
            metaPageId: pageId,
            metaAccessToken: encryptedToken,
            isAIActive: true,
        }, { new: true });

        res.json({ message: 'Meta automated link authorization established' });
    } catch (error) {
        console.error('❌ Meta channel linking pipeline exception:', error.response?.data || error.message);
        res.status(500).json({ error: 'Meta token system alignment breakdown' });
    }
});

app.put('/api/shop/manual-facebook', authMiddleware, async (req, res) => {
    try {
        const { metaPageId, metaAccessToken } = req.body;
        if (!metaPageId || !metaAccessToken) return res.status(400).json({ error: 'Configuration mapping empty' });
        const encryptedToken = encryptToken(metaAccessToken.trim());
        await Shop.findByIdAndUpdate(req.shopId, {
            metaPageId: metaPageId.trim(),
            metaAccessToken: encryptedToken,
            isAIActive: true,
        }, { new: true });
        res.json({ message: 'Manual fallback profile mapped successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Fallback profile update operations failed' });
    }
});

app.put('/api/shop/manual-whatsapp', authMiddleware, async (req, res) => {
    try {
        const { whatsappPhoneNumberId, whatsappAccessToken } = req.body;
        if (!whatsappPhoneNumberId || !whatsappAccessToken) return res.status(400).json({ error: 'Configuration mapping empty' });
        const encryptedToken = encryptToken(whatsappAccessToken.trim());
        await Shop.findByIdAndUpdate(req.shopId, {
            whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
            whatsappAccessToken: encryptedToken,
            isAIActive: true,
        }, { new: true });
        res.json({ message: 'WhatsApp secure pipeline initialized' });
    } catch (err) {
        res.status(500).json({ error: 'Secure WhatsApp node storage failed' });
    }
});

app.get('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findById(req.shopId).lean();
        if (!shop) return res.status(404).json({ error: 'Context tenant mapping absent' });
        res.json({
            isAIActive: shop.isAIActive,
            systemPrompt: shop.systemPrompt,
            metaPageId: shop.metaPageId,
            whatsappPhoneNumberId: shop.whatsappPhoneNumberId,
            plan: shop.plan,
            usage: shop.monthlyMessageCount,
        });
    } catch (err) {
        res.status(500).json({ error: 'Configuration compilation step dropped' });
    }
});

app.put('/api/shop/config', authMiddleware, async (req, res) => {
    try {
        const { isAIActive, systemPrompt } = req.body;
        const shop = await Shop.findByIdAndUpdate(req.shopId, {
            ...(isAIActive !== undefined && { isAIActive }),
            ...(systemPrompt !== undefined && { systemPrompt }),
        }, { new: true }).lean();
        if (!shop) return res.status(404).json({ error: 'Context tenant mapping absent' });
        res.json(shop);
    } catch (err) {
        res.status(500).json({ error: 'Configuration modification write step rejected' });
    }
});

// ══════════════════════════════════════════════════════════════
//  6. Products, Orders & Data Sync Engines
// ══════════════════════════════════════════════════════════════
app.get('/api/products', authMiddleware, async (req, res) => {
    try { res.json(await Product.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean()); }
    catch (err) { res.status(500).json({ error: 'Catalog array mapping down' }); }
});

app.post('/api/products', authMiddleware, async (req, res) => {
    try { res.status(201).json(await Product.create({ ...req.body, shopId: req.shopId })); }
    catch (err) { res.status(400).json({ error: 'Catalog insertion rejected: constraints' }); }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
    try {
        const p = await Product.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, req.body, { new: true });
        if (!p) return res.status(404).json({ error: 'Catalog node untraceable' });
        res.json(p);
    } catch (err) { res.status(400).json({ error: 'Catalog node amendment execution failed' }); }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
    try {
        const p = await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
        if (!p) return res.status(404).json({ error: 'Catalog deletion reference unavailable' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Purge operation aborted inside engine' }); }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
    try { res.json({ orders: await Order.find({ shopId: req.shopId }).sort({ createdAt: -1 }).lean() }); }
    catch (err) { res.status(500).json({ error: 'Order transaction tracking matrix unreadable' }); }
});

app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
    try {
        const o = await Order.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, { status: req.body.status }, { new: true });
        if (!o) return res.status(404).json({ error: 'Transaction element reference untraceable' });
        res.json(o);
    } catch (err) { res.status(400).json({ error: 'State machine mutation rejected' }); }
});

app.get('/api/analytics', authMiddleware, async (req, res) => {
    try {
        const [totalOrders, revenueAgg] = await Promise.all([
            Order.countDocuments({ shopId: req.shopId }),
            Order.aggregate([{ $match: { shopId: req.shopId } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
        ]);
        res.json({ totalOrders, totalRevenue: revenueAgg[0]?.total ?? 0 });
    } catch (err) {
        res.status(500).json({ error: 'Aggregation compilation pipeline dropped' });
    }
});

// ══════════════════════════════════════════════════════════════
//  7. Enterprise AI Engine & Micro Rate Limiting Architecture
// ══════════════════════════════════════════════════════════════
const PLAN_LIMITS = {
    Starter:    { rpm: 5,  maxMessages: 2_000   },
    Business:   { rpm: 8,  maxMessages: 5_000   },
    Pro:        { rpm: 10, maxMessages: 15_000  },
    Enterprise: { rpm: 15, maxMessages: 999_999 },
};

const shopRPMTracker = Object.create(null);

// Automated Cache-Eviction to prevent long-lived server memory leaks
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
        messageQueue.shift(); // Evicts oldest request if threshold breaches
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
    } default {
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
        model: 'gemini-2.0-flash-lite',
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
            console.warn('⚠️ Webhook image stream acquisition failed:', e.message);
        }
    }
    parts.push({ text: text || 'Please review this.' });

    try {
        const result = await geminiWithTimeout(chat, parts, 20_000);
        const aiText = result.response.text();

        await Shop.findByIdAndUpdate(shop._id, { $inc: { monthlyMessageCount: 1 } });

        // Database optimization: Stores last 20 elements strictly to trim document growth load
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
        if (err.name === 'AbortError') return 'AI response timed out. Please try again.';
        if (err.message?.includes('429')) return 'বট ব্যস্ত আছে। একটু পর মেসেজ দিন। 🙏';
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

                if (!product) continue; // Skip items not securely bound to inventory tracking codes

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
        console.error('❌ Automation engine order sync failure:', err.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  8. Transient Memory Queue Processing Engine
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
                if (!token) continue;
                await axios.post(
                    `https://graph.facebook.com/v19.0/${shop.whatsappPhoneNumberId}/messages`,
                    { messaging_product: 'whatsapp', to: item.psid, type: 'text', text: { body: cleanMessage } },
                    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15_000 }
                );
            } else {
                const token = decryptToken(shop.metaAccessToken);
                if (!token) continue;
                await axios.post(
                    'https://graph.facebook.com/v19.0/me/messages',
                    { recipient: { id: item.psid }, message: { text: cleanMessage } },
                    { params: { access_token: token }, timeout: 15_000 }
                );
            }

            await processOrderSync(shop, aiRes);
        } catch (err) {
            console.error('❌ Memory loop draining tracking error:', err.message);
        }
    }

    setTimeout(drainQueue, 5_000);
}

if (process.env.NODE_ENV !== 'test') {
    drainQueue();
}

// ══════════════════════════════════════════════════════════════
//  9. Cryptographic Webhook Security Verification
// ══════════════════════════════════════════════════════════════
function verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return res.sendStatus(403);
    
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appSecret) return res.sendStatus(500);
    
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    
    if (!valid) return res.sendStatus(403);
    
    try { req.body = JSON.parse(rawBody.toString()); } catch (_) { req.body = {}; }
    next();
}

// ══════════════════════════════════════════════════════════════
//  10. Multi-Tenant Messenger Webhook Receiver
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
        if (!token) return res.status(200).send('EVENT_RECEIVED');

        // Context Flusher Block - Resets chat history memory context natively
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
        console.error('❌ Messenger Webhook pipeline trace exception:', err.message);
        return res.status(200).send('EVENT_RECEIVED');
    }
});

// ══════════════════════════════════════════════════════════════
//  11. Multi-Tenant WhatsApp Cloud API Receiver
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
        if (!token) return res.status(200).send('EVENT_RECEIVED');

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
        console.error('❌ WhatsApp Webhook pipeline trace exception:', err.message);
        return res.status(200).send('EVENT_RECEIVED');
    }
});

// ══════════════════════════════════════════════════════════════
//  12. Global Error Pipeline Orchestration & Initialization
// ══════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
    console.error('❌ Deep execution failure caught:', err.message);
    res.status(500).json({ error: 'Internal pipeline structural error' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Enterprise master node tracking on port ${PORT}`));
}
module.exports = app;