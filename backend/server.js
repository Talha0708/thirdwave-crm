import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js'; // ✅ নতুন রাউট ইমপোর্ট করা হলো

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
app.use('/api/admin', adminRoutes); // ✅ অ্যাডমিন রাউট কানেক্ট করা হলো

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