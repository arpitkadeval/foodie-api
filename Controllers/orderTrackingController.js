import OrderTracking from '../Models/orderTrackingModel.js';
import { io } from '../server.js'; // Assuming Socket.io is set up in server.js

// Create order tracking entry
export const createOrderTracking = async (req, res) => {
  try {
    const { orderId, customerId, deliveryAddress, estimatedDeliveryTime } = req.body;
    
    // Check if tracking already exists
    const existingTracking = await OrderTracking.findOne({ orderId });
    if (existingTracking) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order tracking already exists' 
      });
    }

    const tracking = new OrderTracking({
      orderId,
      customerId,
      deliveryAddress: {
        type: 'Point',
        coordinates: deliveryAddress.coordinates,
        address: deliveryAddress.address
      },
      estimatedDeliveryTime: new Date(estimatedDeliveryTime)
    });

    // Add initial tracking entry
    tracking.trackingHistory.push({
      status: 'placed',
      timestamp: new Date(),
      location: tracking.restaurantLocation,
      message: 'Order has been placed successfully'
    });

    const savedTracking = await tracking.save();
    
    // Emit real-time update
    io.to(`user_${customerId}`).emit('orderStatusUpdate', {
      orderId,
      status: 'placed',
      tracking: savedTracking
    });

    res.status(201).json({
      success: true,
      data: savedTracking,
      message: 'Order tracking created successfully'
    });
  } catch (error) {
    console.error('Error creating order tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create order tracking',
      error: error.message 
    });
  }
};

// Get order tracking by order ID
export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const tracking = await OrderTracking.findOne({ orderId })
      .populate('orderId', 'orderItems totalPrice createdAt')
      .populate('customerId', 'username email phone')
      .populate('riderId', 'username phone');

    if (!tracking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order tracking not found' 
      });
    }

    res.json({
      success: true,
      data: tracking,
      message: 'Order tracking retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting order tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get order tracking',
      error: error.message 
    });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, message, riderData } = req.body;

    const tracking = await OrderTracking.findOne({ orderId });
    if (!tracking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order tracking not found' 
      });
    }

    // Assign rider if provided
    if (riderData) {
      await tracking.assignRider(riderData);
    }

    // Update status with location and message
    await tracking.updateStatus(status, location, message);
    
    // Populate for response
    const updatedTracking = await OrderTracking.findOne({ orderId })
      .populate('orderId', 'orderItems totalPrice')
      .populate('customerId', 'username email')
      .populate('riderId', 'username phone');

    // Emit real-time update to customer
    io.to(`user_${tracking.customerId}`).emit('orderStatusUpdate', {
      orderId,
      status,
      location,
      message,
      tracking: updatedTracking,
      progressPercentage: updatedTracking.progressPercentage,
      estimatedTimeRemaining: updatedTracking.estimatedTimeRemaining
    });

    // Emit to rider if assigned
    if (tracking.riderId) {
      io.to(`rider_${tracking.riderId}`).emit('orderUpdate', {
        orderId,
        status,
        tracking: updatedTracking
      });
    }

    res.json({
      success: true,
      data: updatedTracking,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status',
      error: error.message 
    });
  }
};

// Update rider location in real-time
export const updateRiderLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { coordinates, heading = 0, speed = 0 } = req.body;

    const tracking = await OrderTracking.findOne({ orderId });
    if (!tracking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order tracking not found' 
      });
    }

    if (!tracking.riderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No rider assigned to this order' 
      });
    }

    // Update current location
    tracking.currentLocation = {
      type: 'Point',
      coordinates: coordinates
    };

    await tracking.save();

    // Emit real-time location update to customer
    io.to(`user_${tracking.customerId}`).emit('riderLocationUpdate', {
      orderId,
      location: {
        coordinates,
        heading,
        speed
      },
      riderInfo: tracking.riderInfo,
      estimatedTimeRemaining: tracking.estimatedTimeRemaining
    });

    res.json({
      success: true,
      message: 'Rider location updated successfully'
    });
  } catch (error) {
    console.error('Error updating rider location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update rider location',
      error: error.message 
    });
  }
};

// Get active trackings for customer
export const getCustomerActiveTrackings = async (req, res) => {
  try {
    const { customerId } = req.params;

    const trackings = await OrderTracking.find({ 
      customerId,
      status: { $nin: ['delivered', 'cancelled'] },
      isActive: true
    })
    .populate('orderId', 'orderItems totalPrice createdAt')
    .populate('riderId', 'username phone')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: trackings,
      count: trackings.length,
      message: 'Active trackings retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting customer trackings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get customer trackings',
      error: error.message 
    });
  }
};

// Get nearby orders for rider
export const getNearbyOrders = async (req, res) => {
  try {
    const { coordinates, maxDistance = 5000 } = req.query;
    
    if (!coordinates) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coordinates are required' 
      });
    }

    const coords = coordinates.split(',').map(coord => parseFloat(coord));
    if (coords.length !== 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid coordinates format. Use: longitude,latitude' 
      });
    }

    const orders = await OrderTracking.findNearbyOrders(coords, parseInt(maxDistance));

    res.json({
      success: true,
      data: orders,
      count: orders.length,
      message: 'Nearby orders retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting nearby orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get nearby orders',
      error: error.message 
    });
  }
};

// Get tracking history
export const getTrackingHistory = async (req, res) => {
  try {
    const { orderId } = req.params;

    const tracking = await OrderTracking.findOne({ orderId })
      .select('trackingHistory status progressPercentage estimatedTimeRemaining actualDeliveryTime');

    if (!tracking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order tracking not found' 
      });
    }

    res.json({
      success: true,
      data: {
        history: tracking.trackingHistory.sort((a, b) => a.timestamp - b.timestamp),
        currentStatus: tracking.status,
        progressPercentage: tracking.progressPercentage,
        estimatedTimeRemaining: tracking.estimatedTimeRemaining,
        actualDeliveryTime: tracking.actualDeliveryTime
      },
      message: 'Tracking history retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting tracking history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get tracking history',
      error: error.message 
    });
  }
};

// Simulate rider movement (for testing purposes)
export const simulateRiderMovement = async (req, res) => {
  try {
    const { orderId } = req.params;

    const tracking = await OrderTracking.findOne({ orderId });
    if (!tracking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order tracking not found' 
      });
    }

    // Simulate movement from restaurant to delivery address
    const startCoords = tracking.restaurantLocation.coordinates;
    const endCoords = tracking.deliveryAddress.coordinates;
    
    // Simple linear interpolation for demo
    const steps = 20;
    const stepDelay = 3000; // 3 seconds between updates
    
    let currentStep = 0;
    const interval = setInterval(async () => {
      if (currentStep >= steps) {
        clearInterval(interval);
        // Mark as delivered
        await tracking.updateStatus('delivered', {
          type: 'Point',
          coordinates: endCoords
        }, 'Order delivered successfully!');
        
        io.to(`user_${tracking.customerId}`).emit('orderStatusUpdate', {
          orderId,
          status: 'delivered',
          location: { coordinates: endCoords },
          message: 'Order delivered successfully!'
        });
        return;
      }

      const progress = currentStep / steps;
      const currentLat = startCoords[1] + (endCoords[1] - startCoords[1]) * progress;
      const currentLng = startCoords[0] + (endCoords[0] - startCoords[0]) * progress;
      
      const currentCoords = [currentLng, currentLat];
      
      // Update location
      tracking.currentLocation = {
        type: 'Point',
        coordinates: currentCoords
      };
      
      await tracking.save();

      // Emit real-time update
      io.to(`user_${tracking.customerId}`).emit('riderLocationUpdate', {
        orderId,
        location: {
          coordinates: currentCoords,
          heading: 45,
          speed: 25
        },
        riderInfo: tracking.riderInfo
      });

      currentStep++;
    }, stepDelay);

    res.json({
      success: true,
      message: 'Rider simulation started'
    });
  } catch (error) {
    console.error('Error simulating rider movement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to simulate rider movement',
      error: error.message 
    });
  }
};