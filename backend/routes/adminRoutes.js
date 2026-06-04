import express from 'express';
// getAllClients টা ইম্পোর্টে অ্যাড কর
import { getDashboardStats, addClient, getAllClients } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard-stats', protect, admin, getDashboardStats);
router.post('/add-client', protect, admin, addClient);
// ─── NEW ROUTE ───
router.get('/clients', protect, admin, getAllClients);

export default router;