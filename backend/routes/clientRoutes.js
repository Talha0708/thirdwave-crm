import express from 'express';
import { getClientDashboardData } from '../controllers/clientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// শুধু লগইন করা ক্লায়েন্ট এই API হিট করতে পারবে (এখানে admin মিডলওয়্যার লাগবে না)
router.get('/dashboard', protect, getClientDashboardData);

export default router;