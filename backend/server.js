import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js'; 
import productRoutes from './routes/productRoutes.js'; 
import orderRoutes from './routes/orderRoutes.js'; // 💥 NEW: Order Route ইমপোর্ট করা হলো
import aiConfigRoutes from './routes/aiConfigRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

// রুট ফোল্ডার থেকে .env রিড করার সেটআপ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// ডেটাবেস কানেক্ট
connectDB();

// মিডলওয়্যার
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// API রাউটস
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes); 
app.use('/api/products', productRoutes); 
app.use('/api/orders', orderRoutes); // 💥 NEW: Order Route কানেক্ট করা হলো (এটাই 404 সলভ করবে!)
app.use('/api/ai-config', aiConfigRoutes);
app.use('/api/customers', customerRoutes); // 💥 NEW
app.use('/api/webhook', webhookRoutes); // 💥 NEW: Facebook Webhook


// বেসিক টেস্টিং রাউট
app.get('/api', (req, res) => {
    res.json({ 
        status: 'success',
        message: 'Welcome to Thirdwave CRM API Engine 🚀 (Vercel Ready)' 
    });
});

// লোকাল পিসিতে টেস্ট করার জন্য
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Local Server running on port ${PORT}`);
    });
}

// Vercel-এর জন্য এক্সপোর্ট
export default app;