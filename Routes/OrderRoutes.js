import express from 'express';
import {
  confirmPayment,
  createOrder,
  getAllOrders,
  getOrderById,
  getOrders,
  updateAnyOrder,
  updateById,
} from '../Controllers/orderController.js';
import authMiddleware from '../middleware/auth.js';

const orderRouter = express.Router();

orderRouter.get('/getall', getAllOrders);
orderRouter.put('/getall/:id', updateAnyOrder);

// PROTECT REST OF ROUTES USING MIDDLEWARE
orderRouter.use(authMiddleware);

orderRouter.post('/', createOrder);
orderRouter.post('/create', createOrder);
orderRouter.get('/', getOrders);
orderRouter.get('/my-orders', getOrders);
orderRouter.get('/confirm', confirmPayment);
orderRouter.get('/:id', getOrderById);
orderRouter.put('/:id', updateById);

export default orderRouter;
