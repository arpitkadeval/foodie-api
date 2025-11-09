import PromoCode from '../Models/PromoCodeModel.js';
import Order from '../Models/OrderModel.js';

// Apply promo code to order
export const applyPromoCode = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code || !orderTotal) {
      return res.status(400).json({
        success: false,
        message: 'Please provide promo code and order total'
      });
    }

    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!promoCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired promo code'
      });
    }

    // Check usage limit
    if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Promo code usage limit reached'
      });
    }

    // Check minimum order value
    if (promoCode.minimumOrderValue && orderTotal < promoCode.minimumOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${promoCode.minimumOrderValue} required`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let finalAmount = orderTotal;

    if (promoCode.discountType === 'percentage') {
      discountAmount = (orderTotal * promoCode.discountValue) / 100;
      if (promoCode.maximumDiscount && discountAmount > promoCode.maximumDiscount) {
        discountAmount = promoCode.maximumDiscount;
      }
    } else if (promoCode.discountType === 'fixed') {
      discountAmount = promoCode.discountValue;
    }

    finalAmount = Math.max(orderTotal - discountAmount, 0);

    res.json({
      success: true,
      data: {
        originalAmount: orderTotal,
        discountAmount,
        finalAmount,
        promoCode: {
          code: promoCode.code,
          description: promoCode.description,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying promo code',
      error: error.message
    });
  }
};

// Validate promo code
export const validatePromoCode = async (req, res) => {
  try {
    const { code } = req.body;

    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!promoCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired promo code'
      });
    }

    res.json({
      success: true,
      data: {
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        minimumOrderValue: promoCode.minimumOrderValue,
        maximumDiscount: promoCode.maximumDiscount,
        startDate: promoCode.startDate,
        endDate: promoCode.endDate
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating promo code',
      error: error.message
    });
  }
};

// Get available promo codes
export const getAvailablePromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      $or: [
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    }).select('-usedCount -usageLimit');

    res.json({
      success: true,
      data: promoCodes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching promo codes',
      error: error.message
    });
  }
};

// Get all promo codes for admin management
export const getAllPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({})
      .populate('applicableCategories', 'name')
      .populate('applicableItems', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: promoCodes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching promo codes',
      error: error.message
    });
  }
};

// Create new promo code (admin only)
export const createPromoCode = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderValue,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit
    } = req.body;

    // Check if promo code already exists
    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }

    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minimumOrderValue,
      maximumDiscount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: req.body.createdBy || 'admin',
      usageLimit,
      usedCount: 0,
      isActive: true
    });

    await promoCode.save();

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: promoCode
    });

  } catch (error) {
    console.error('Detailed error in createPromoCode:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating promo code',
      error: error.message
    });
  }
};

// Update promo code usage
export const updatePromoCodeUsage = async (code) => {
  try {
    await PromoCode.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $inc: { usedCount: 1 } }
    );
  } catch (error) {
    console.error('Error updating promo code usage:', error);
  }
};

export default {
  applyPromoCode,
  validatePromoCode,
  getAvailablePromoCodes,
  createPromoCode,
  updatePromoCodeUsage
};
