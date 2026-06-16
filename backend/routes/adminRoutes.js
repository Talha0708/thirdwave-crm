import express from 'express';
import { 
    getDashboardStats, 
    addClient, 
    getAllClients, 
    updateClient,
    toggleSystemApi // 💥 NEW: ইমপোর্ট করা হলো
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard-stats', protect, admin, getDashboardStats);
router.post('/add-client', protect, admin, addClient);
router.get('/clients', protect, admin, getAllClients);

// ─── এডিট করার PUT রাউট ───
router.put('/client/:id', protect, admin, updateClient); 

// ─── 💥 NEW: System API Toggle রাউট ───
router.put('/clients/:clientId/toggle-api', protect, admin, toggleSystemApi); 

export default router;