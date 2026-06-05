import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // তোর মিডলওয়্যারের নাম অনুযায়ী মেলাবি
import { createOrder, getOrders, updateOrderStatus } from '../controllers/orderController.js';

const router = express.Router();

// রুটস ডিফাইন করা (সব প্রোটেক্টেড থাকবে)
router.route('/')
      .post(protect, createOrder)
      .get(protect, getOrders);

router.route('/:id')
      .put(protect, updateOrderStatus);

export default router;