import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAiConfig, updateAiConfig, updateIntegration } from '../controllers/aiConfigController.js';

const router = express.Router();

router.route('/')
    .get(protect, getAiConfig)
    .put(protect, updateAiConfig);

// 💥 NEW: Universal Integration Route (For Facebook & WhatsApp)
router.post('/integration', protect, updateIntegration);

export default router;