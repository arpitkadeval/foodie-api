import express from 'express';
import {
  getSalesOverview,
  getOrderAnalytics,
  getCustomerAnalytics,
  getProductAnalytics,
  getRevenueReport,
  getDashboardStats
} from '../Controllers/adminController.js';
import { createPromoCode, getAllPromoCodes } from '../Controllers/promoCodeController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Admin routes (protected)
router.get('/sales-overview', authMiddleware, getSalesOverview);
router.get('/order-analytics', authMiddleware, getOrderAnalytics);
router.get('/customer-analytics', authMiddleware, getCustomerAnalytics);
router.get('/product-analytics', authMiddleware, getProductAnalytics);
router.get('/revenue-report', authMiddleware, getRevenueReport);
router.get('/dashboard-stats', authMiddleware, getDashboardStats);

// Promo code management (admin only)
router.get('/promocodes', authMiddleware, getAllPromoCodes);
router.post('/create-promocode', createPromoCode);

export default router;
