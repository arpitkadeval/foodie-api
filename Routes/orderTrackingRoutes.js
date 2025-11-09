import express from 'express';
import {
  createOrderTracking,
  getOrderTracking,
  updateOrderStatus,
  updateRiderLocation,
  getCustomerActiveTrackings,
  getNearbyOrders,
  getTrackingHistory,
  simulateRiderMovement
} from '../Controllers/orderTrackingController.js';

const router = express.Router();

// Create order tracking
router.post('/create', createOrderTracking);

// Get order tracking by order ID
router.get('/order/:orderId', getOrderTracking);

// Update order status
router.put('/status/:orderId', updateOrderStatus);

// Update rider location
router.put('/location/:orderId', updateRiderLocation);

// Get active trackings for customer
router.get('/customer/:customerId/active', getCustomerActiveTrackings);

// Get nearby orders for riders
router.get('/nearby', getNearbyOrders);

// Get tracking history
router.get('/history/:orderId', getTrackingHistory);

// Simulate rider movement (for testing)
router.post('/simulate/:orderId', simulateRiderMovement);

export default router;