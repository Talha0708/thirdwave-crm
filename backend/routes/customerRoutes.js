import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getCustomers } from '../controllers/customerController.js';

const router = express.Router();

router.route('/').get(protect, getCustomers);

export default router;