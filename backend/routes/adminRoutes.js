import express from 'express';
import { getDashboardStats, addClient, getAllClients, updateClient } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard-stats', protect, admin, getDashboardStats);
router.post('/add-client', protect, admin, addClient);
router.get('/clients', protect, admin, getAllClients);
// ─── NEW: এডিট করার PUT রাউট ───
router.put('/client/:id', protect, admin, updateClient); 

export default router;