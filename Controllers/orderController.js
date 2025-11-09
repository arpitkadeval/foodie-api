// Controllers/orderController.js
import Order from '../models/OrderModel.js'; // adjust path to your model
import Cart from '../Models/cartModel.js';

// ✅ Create new order
export const createOrder = async (req, res) => {
  try {
    console.log("📦 Incoming Order Request:", req.body);
    console.log("👤 User:", req.user);

    // Authentication check
    console.log("🔐 Auth check - req.user:", req.user);
    if (!req.user || !req.user._id) {
      console.log("❌ Authentication failed - no user or user._id");
      return res.status(401).json({ message: 'Authentication required' });
    }
    console.log("✅ Authentication successful - user ID:", req.user._id);

    // Map orderItems to match the model structure
    console.log("📦 Raw orderItems:", req.body.orderItems);
    const orderItems = req.body.orderItems.map(item => {
      const mappedItem = {
        name: item.name,
        qty: item.qty || item.quantity,
        price: item.price,
        image: item.imageUrl || item.image,
        product: item.product || item._id || item.itemId
      };
      console.log("📦 Mapped item:", mappedItem);
      return mappedItem;
    });

    // Map shipping address
    console.log("🏠 Raw shippingAddress:", req.body.shippingAddress);
    const shippingAddress = {
      address: req.body.shippingAddress?.address || req.body.shippingAddress?.fullName || '',
      city: req.body.shippingAddress?.city || '',
      postalCode: req.body.shippingAddress?.postalCode || '',
      country: req.body.shippingAddress?.country || ''
    };
    console.log("🏠 Mapped shippingAddress:", shippingAddress);

    const orderData = {
      user: req.user._id,
      orderItems: orderItems,
      shippingAddress: shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice || 0,
      taxPrice: req.body.taxPrice || 0,
      shippingPrice: req.body.shippingPrice || 0,
      totalPrice: req.body.totalPrice || 0,
      email: req.user.email || req.body.email,
      status: req.body.paymentMethod === 'Cash on Delivery' ? 'delivered' : 'pending',
      paymentStatus: req.body.paymentMethod === 'Cash on Delivery' ? 'paid' : 'pending',
      isPaid: req.body.paymentMethod === 'Cash on Delivery',
      paidAt: req.body.paymentMethod === 'Cash on Delivery' ? new Date() : null,
      appliedPromoCode: req.body.appliedPromoCode || null,
      discountAmount: req.body.discountAmount || 0
    };
    
    console.log("💾 Order data to save:", orderData);
    const order = new Order(orderData);

    const createdOrder = await order.save();
    // 🛒 Clear user's cart after successful order
    await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: [] } });
    console.log("✅ Order created successfully:", createdOrder._id);
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("❌ createOrder Error:", error);
    console.error("Error stack:", error.stack);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation Error", 
        errors: validationErrors,
        details: error.message 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate entry", 
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      message: "Server Error", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// ✅ Get all orders (admin only)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email')
      .populate('orderItems.product', 'name price imageUrl')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ getAllOrders Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ✅ Get logged-in user's orders
export const getOrders = async (req, res) => {
  try {
    console.log("🔍 Fetching orders for user:", req.user._id);
    
    const orders = await Order.find({ user: req.user._id })
      .populate('user', 'username email')
      .populate('orderItems.product', 'name price imageUrl')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log("📦 Found orders:", orders.length);
    
    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderItems: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
        imageUrl: item.image || item.product?.imageUrl,
        item: {
          _id: item.product?._id || item.product,
          name: item.name,
          price: item.price,
          imageUrl: item.image || item.product?.imageUrl
        }
      })),
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      itemsPrice: order.itemsPrice,
      taxPrice: order.taxPrice,
      shippingPrice: order.shippingPrice,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      user: order.user
    }));
    
    res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('❌ getOrders Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ✅ Get order by ID (with ownership + email check)
export const getOrderById = async (req, res) => {
  try {
    console.log('🔍 Incoming request for order:', req.params.id);
    console.log('Authenticated User:', req.user?._id, req.user?.email);

    const order = await Order.findById(req.params.id);
    if (!order) {
      console.warn('⚠️ Order not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('✅ Order found:', order._id);
    console.log('Order belongs to User:', order.user);

    if (!order.user.equals(req.user._id)) {
      console.warn(`🚫 Access denied. Order User (${order.user}) !== Request User (${req.user._id})`);
      return res.status(403).json({ message: 'Access Denied' });
    }

    if (req.query.email && order.email !== req.query.email) {
      console.warn(`🚫 Email mismatch. Order Email (${order.email}) !== Query Email (${req.query.email})`);
      return res.status(403).json({ message: 'Access Denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ getOrderById Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ✅ Update order by ID (for logged-in user)
export const updateById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    Object.assign(order, req.body);
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ updateById Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ✅ Update any order (Admin use)
export const updateAnyOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    Object.assign(order, req.body);
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ updateAnyOrder Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ✅ Confirm payment (dummy placeholder, expand with payment gateway)
export const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentId } = req.query;
    console.log(`💳 Confirming payment for order ${orderId}, paymentId: ${paymentId}`);

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = { id: paymentId };

    const updatedOrder = await order.save();
    res.json({ message: 'Payment confirmed', order: updatedOrder });
  } catch (error) {
    console.error('❌ confirmPayment Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
