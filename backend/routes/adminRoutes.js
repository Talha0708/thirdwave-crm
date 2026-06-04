import express from 'express';
import { getDashboardStats, addClient } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// শুধু লগইন করা অ্যাডমিন এই API গুলো কল করতে পারবে
router.get('/dashboard-stats', protect, admin, getDashboardStats);
router.post('/add-client', protect, admin, addClient);

export default router;