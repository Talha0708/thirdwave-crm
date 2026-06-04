import express from 'express';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// রাউটগুলোর সাথে Controller কানেক্ট করা হলো
router.route('/')
      .get(protect, getProducts)
      .post(protect, addProduct);

router.route('/:id')
      .put(protect, updateProduct)
      .delete(protect, deleteProduct);

export default router;