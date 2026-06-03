import mongoose from 'mongoose';

const connectDB = async () => {
    // Vercel Serverless-এর জন্য কানেকশন চেক
    if (mongoose.connections[0].readyState) {
        console.log('⚡ Using existing MongoDB connection');
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;