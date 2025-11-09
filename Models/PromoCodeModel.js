import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'free_shipping'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minimumOrderValue: {
    type: Number,
    default: 0,
    min: 0
  },
  maximumDiscount: {
    type: Number,
    default: null
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  applicableItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Check if promo code is valid
promoCodeSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now &&
         (!this.usageLimit || this.usedCount < this.usageLimit);
};

// Calculate discount
promoCodeSchema.methods.calculateDiscount = function(orderValue) {
  if (!this.isValid() || orderValue < this.minimumOrderValue) {
    return 0;
  }

  let discount = 0;
  
  switch (this.discountType) {
    case 'percentage':
      discount = (orderValue * this.discountValue) / 100;
      break;
    case 'fixed':
      discount = this.discountValue;
      break;
    case 'free_shipping':
      discount = 0; // Shipping cost will be handled separately
      break;
  }

  if (this.maximumDiscount && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }

  return discount;
};

const PromoCode = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);
export default PromoCode;
