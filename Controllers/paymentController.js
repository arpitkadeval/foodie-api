import Stripe from 'stripe';
import dotenv from 'dotenv';
import Order from '../models/OrderModel.js';
import userModel from '../Models/userModel.js';
import Cart from '../Models/cartModel.js';

dotenv.config();

// Helper to normalize frontend URL (strip quotes & trailing slash)
const FRONTEND_BASE = (() => {
  let raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  // Remove surrounding quotes if present
  raw = raw.replace(/^['"]|['"]$/g, '');
  // Remove trailing slash
  raw = raw.replace(/\/$/, '');
  return raw;
})();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 1️⃣ Create Payment Session
export const createPaymentSession = async (req, res) => {
  try {
    console.log('createPaymentSession request body:', JSON.stringify(req.body, null, 2));

    const { cartItems, shippingDetails, customerEmail } = req.body;
    const email = customerEmail || shippingDetails?.email;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cart is empty' 
      });
    }

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Customer email is required' 
      });
    }

    // Validate cart items
    for (const item of cartItems) {
      if (!item.name || !item.price || !item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid cart item: missing name, price, or quantity' 
        });
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% tax
    const deliveryCharge = subtotal > 500 ? 0 : 50;
    const totalAmount = subtotal + tax + deliveryCharge;

    // ✅ Map cartItems to Stripe line_items format
    const line_items = cartItems.map(item => {
      let imageUrl = item.imageUrl;
      if (imageUrl && !(imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        imageUrl = FRONTEND_BASE + '/' + imageUrl.replace(/^\//, '');
      }

      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: item.name,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Optionally create a Stripe customer to prefill shipping details on Checkout
    let customerId = undefined;
    try {
      const customer = await stripe.customers.create({
        email,
        name: shippingDetails?.fullName,
        phone: shippingDetails?.phone,
        address: {
          line1: shippingDetails?.address,
          city: shippingDetails?.city,
          postal_code: shippingDetails?.postalCode,
          country: (shippingDetails?.country || 'IN').toUpperCase(),
        },
        shipping: {
          name: shippingDetails?.fullName,
          address: {
            line1: shippingDetails?.address,
            city: shippingDetails?.city,
            postal_code: shippingDetails?.postalCode,
            country: (shippingDetails?.country || 'IN').toUpperCase(),
          },
          phone: shippingDetails?.phone,
        },
      });
      customerId = customer.id;
    } catch (e) {
      console.warn('Unable to create Stripe customer for prefill:', e?.message);
    }

    // Create checkout session with metadata
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${FRONTEND_BASE}/checkout?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${FRONTEND_BASE}/cancel`,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['IN', 'US'] },
      phone_number_collection: { enabled: true },
      customer_update: { address: 'auto', shipping: 'auto', name: 'auto' },
      // customer/customer_email injected below after conflicts resolved
      metadata: {
        // Store order data in metadata for webhook processing
        customerEmail: email,
        shippingDetails: JSON.stringify(shippingDetails),
        cartItems: JSON.stringify(cartItems),
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        deliveryCharge: deliveryCharge.toString(),
        totalAmount: totalAmount.toString(),
        user: req.user?.id || '', // From auth middleware
      }
    };

    // Attach either customer or customer_email (with optional customer_creation) to avoid conflicts
    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_email = email;
      sessionConfig.customer_creation = 'if_required';
    }

    if (shippingDetails) {
      sessionConfig.shipping_address_collection = { 
        allowed_countries: ['IN', 'US']
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Create a pending order immediately so it appears in My Orders before payment
    try {
      const resolvedUser = req.user?._id || null;
      const pendingOrderData = {
        sessionId: session.id,
        user: resolvedUser || undefined,
        orderItems: cartItems.map(item => ({
          product: item._id || item.itemId || null,
          qty: item.quantity,
          name: item.name,
          price: item.price,
          image: item.imageUrl,
        })),
        shippingAddress: {
          address: shippingDetails?.address || shippingDetails?.address1 || '',
          city: shippingDetails?.city || '',
          postalCode: shippingDetails?.postalCode || shippingDetails?.zipCode || '',
          country: shippingDetails?.country || 'India',
        },
        paymentMethod: 'Credit Card',
        itemsPrice: subtotal,
        taxPrice: tax,
        shippingPrice: deliveryCharge,
        totalPrice: totalAmount,
        email: email,
        isPaid: false,
        status: 'pending',
        paymentStatus: 'pending',
      };

      // Only create if not already present (race-safety)
      const existingPending = await Order.findOne({ sessionId: session.id });
      if (!existingPending) {
        await new Order(pendingOrderData).save();
      }
    } catch (e) {
      console.warn('Failed to create pending order for session:', session.id, e?.message);
      // Do not block payment flow
    }

    res.json({ 
      success: true,
      url: session.url, 
      sessionId: session.id,
      id: session.id
    });

  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create payment session', 
      error: error.message
    });
  }
};

// 2️⃣ Stripe Webhook Handler
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful for session:', session.id);
      
      try {
        const created = await createOrderFromSession(session);
        // If a pending order exists, update it to paid and sync fields
        if (!created) {
          const pending = await Order.findOne({ sessionId: session.id });
          if (pending) {
            pending.isPaid = true;
            pending.paidAt = new Date();
            pending.status = 'completed';
            pending.paymentStatus = 'paid';
            pending.paymentIntentId = session.payment_intent?.id;
            await pending.save();
          // Clear cart
          if (pending.user) {
            await Cart.findOneAndUpdate({ userId: pending.user }, { $set: { items: [] } });
          }
          }
        }
      } catch (error) {
        console.error('Error creating/updating order from webhook:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

// 3️⃣ Create Order from Successful Session
const createOrderFromSession = async (session) => {
  try {
    const metadata = session.metadata;
    
    if (!metadata.cartItems || !metadata.customerEmail) {
      console.error('Missing metadata in session:', session.id);
      return;
    }

    const cartItems = JSON.parse(metadata.cartItems);
    const shippingDetails = JSON.parse(metadata.shippingDetails || '{}');

    // Check if order already exists
    const existingOrder = await Order.findOne({ sessionId: session.id });
    if (existingOrder) {
      console.log('Order already exists for session:', session.id);
      return existingOrder;
    }

    // Resolve user from metadata or by email
    let resolvedUserId = metadata.user || undefined;
    const sessionEmail = session.customer_details?.email || session.customer_email || metadata.customerEmail;
    if (!resolvedUserId && sessionEmail) {
      try {
        const existingUser = await userModel.findOne({ email: sessionEmail });
        if (existingUser) {
          resolvedUserId = existingUser._id;
        }
      } catch (e) {
        console.warn('Unable to resolve user by email for session:', session.id, e?.message);
      }
    }

    // Create new order
    const orderData = {
      sessionId: session.id,
      paymentIntentId: session.payment_intent.id,
      user: resolvedUserId,
      orderItems: cartItems.map(item => ({
        product: item._id || item.itemId || null,
        qty: item.quantity,
        name: item.name,
        price: item.price,
        image: item.imageUrl,
      })),
      shippingAddress: {
        fullName: shippingDetails.fullName || `${shippingDetails.firstName} ${shippingDetails.lastName}`,
        email: sessionEmail,
        phone: shippingDetails.phone,
        address: shippingDetails.address,
        city: shippingDetails.city,
        state: shippingDetails.state,
        postalCode: shippingDetails.postalCode,
        country: shippingDetails.country || 'India',
      },
      paymentMethod: 'Credit Card',
      itemsPrice: parseFloat(metadata.subtotal),
      taxPrice: parseFloat(metadata.tax),
      shippingPrice: parseFloat(metadata.deliveryCharge),
      totalPrice: parseFloat(metadata.totalAmount),
      email: sessionEmail,
      isPaid: true,
      paidAt: new Date(),
      status: 'completed',
      paymentStatus: 'paid',
  

    };

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    
    console.log('Order created successfully from webhook:', savedOrder._id);
    // ✅ Clear user cart once order is finalized
      if (resolvedUserId) {
        await Cart.findOneAndUpdate({ userId: resolvedUserId }, { $set: { items: [] } });
      }
      return savedOrder;

  } catch (error) {
    console.error('Error creating order from session:', error);
    throw error;
  }
};

// 4️⃣ Get Session Details and Create Order if Missing
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log('getSessionDetails called with sessionId:', sessionId);
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing sessionId' 
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent', 'customer'],
    });
    console.log('Stripe session retrieved:', session);

    if (!session) {
      return res.status(404).json({ 
        success: false,
        message: 'Session not found' 
      });
    }

    // Check if order exists in database
    let order = await Order.findOne({ sessionId: session.id });
    
    // If payment was successful but no order exists, create one
    if (session.payment_status === 'paid' && !order) {
      console.log('Creating missing order for successful payment:', session.id);
      order = await createOrderFromSession(session);
    }

    const paymentIntentId = session.payment_intent?.id || null;
    const shippingDetails = session.shipping_details || session.shipping || null;
    const customerEmail = session.customer_details?.email || session.customer_email || null;
    const lineItems = session.line_items?.data || [];

    const cartItems = lineItems.map(item => ({
      name: item.description,
      price: item.price.unit_amount / 100,
      quantity: item.quantity,
      imageUrl: item.price.product?.images ? item.price.product.images[0] : null,
    }));

    res.json({
      success: true,
      sessionId: session.id,
      paymentIntentId,
      shippingDetails,
      customerEmail,
      cartItems,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total / 100,
      currency: session.currency,
      order: order ? {
        _id: order._id,
        status: order.status,
        createdAt: order.createdAt
      } : null
    });

  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch session details', 
      error: error.message 
    });
  }
};

// 5️⃣ Manual Order Creation (fallback)
export const createOrderFromPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        message: 'Session ID is required' 
      });
    }

    // Check if order already exists
    const existingOrder = await Order.findOne({ sessionId });
    if (existingOrder) {
      return res.json({
        success: true,
        message: 'Order already exists',
        order: existingOrder
      });
    }

    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    console.log(session);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed yet'
      });
    }

    // Create order from session
    let order = await createOrderFromSession(session);

    // If order wasn't created (already existed as pending), update it to paid
    if (!order) {
      order = await Order.findOne({ sessionId });
      if (order) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = 'completed';
        order.paymentStatus = 'paid';
        order.paymentIntentId = session.payment_intent?.id;
      }
    }

    // Ensure order is linked to the authenticated user so it appears in My Orders
    if (order && !order.user && req.user && req.user._id) {
      order.user = req.user._id;
      order.email = order.email || req.user.email || session.customer_email || null;
    }

    if (order) {
      await order.save();
    }

    res.json({
      success: true,
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    console.error('Error creating order from payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// 6️⃣ Save Order (keep existing for COD)
export const saveOrder = async (req, res) => {
  try {
    const { sessionId, cartItems, customerEmail, amountTotal } = req.body;

    if (!sessionId || !cartItems || !customerEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required order data' 
      });
    }

    const newOrder = new Order({
      sessionId,
      cartItems,
      customerEmail,
      amountTotal,
      status: 'pending',
      createdAt: new Date()
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({ 
      success: true,
      message: 'Order saved successfully', 
      order: savedOrder 
    });

  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save order', 
      error: error.message 
    });
  }
};