import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAiConfig, updateAiConfig } from '../controllers/aiConfigController.js';

const router = express.Router();

router.route('/')
    .get(protect, getAiConfig)
    .put(protect, updateAiConfig);

export default router;