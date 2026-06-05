import express from 'express';
import { verifyWebhook, receiveMessage } from '../controllers/webhookController.js';

const router = express.Router();

// Meta Verification এর জন্য GET Route
router.get('/', verifyWebhook);

// Meta থেকে মেসেজ রিসিভ করার জন্য POST Route
router.post('/', receiveMessage);

export default router;