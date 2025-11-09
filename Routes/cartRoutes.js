import express from 'express';
const router = express.Router();
import * as cartController from '../Controllers/cartController.js';
import auth from '../middleware/auth.js';

router.use(auth);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.delete('/:itemId', cartController.removeFromCart);
router.put('/increment/:itemId', cartController.incrementQuantity);
router.put('/decrement/:itemId', cartController.decrementQuantity);

router.put('/:itemId', cartController.updateQuantity);
router.delete('/', cartController.clearCart);

export default router;
