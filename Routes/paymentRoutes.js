import express from 'express';
import { 
  createPaymentSession, 
  saveOrder, 
  getSessionDetails,
  handleWebhook,
  createOrderFromPayment
} from '../Controllers/paymentController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Webhook endpoint (must be BEFORE express.json() middleware)
router.post('/webhook', express.raw({type: 'application/json'}), handleWebhook);

// Protected routes
router.post('/create-session', authMiddleware, createPaymentSession);
router.post('/create-order', authMiddleware, saveOrder);
router.post('/session-details', authMiddleware, getSessionDetails);
router.post('/create-order-from-payment', authMiddleware, createOrderFromPayment);

export default router;