import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAiConfig, updateAiConfig, updateIntegration, exchangeFacebookToken } from '../controllers/aiConfigController.js';

const router = express.Router();

router.route('/')
    .get(protect, getAiConfig)
    .put(protect, updateAiConfig);

// Universal Integration Route (For Facebook & WhatsApp Manual)
router.post('/integration', protect, updateIntegration);

// 💥 NEW: Facebook OAuth Route (Auto Login Magic)
router.post('/facebook-oauth', protect, exchangeFacebookToken);

export default router;