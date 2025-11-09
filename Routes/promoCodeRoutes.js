import express from 'express';
import { applyPromoCode, validatePromoCode, getAvailablePromoCodes } from '../Controllers/promoCodeController.js';

const router = express.Router();

// Route to apply a promo code
router.post('/apply', applyPromoCode);

// Route to validate a promo code
router.post('/validate', validatePromoCode);

// Route to get available promo codes
router.get('/available', getAvailablePromoCodes);

export default router;
