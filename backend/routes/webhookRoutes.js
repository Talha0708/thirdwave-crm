import express from 'express';
import { verifyWebhook, receiveMessage, processMessageQueue } from '../controllers/webhookController.js';

const router = express.Router();

// Meta Verification এর জন্য GET Route
router.get('/', verifyWebhook);

// Meta থেকে মেসেজ রিসিভ করার জন্য POST Route
router.post('/', receiveMessage);

// 💥 NEW: System Cron Engine URL (এটি ছাড়া Queue প্রসেস হবে না)
router.get('/process-queue', processMessageQueue);

export default router;