import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },

    sessionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    paymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        image: { type: String },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: false, // Make it optional to handle cases where product ID might not be valid
        },
      },
    ],

    shippingAddress: {
      address: { type: String, required: false },
      city: { type: String, required: false },
      postalCode: { type: String, required: false },
      country: { type: String, required: false },
    },

    paymentMethod: {
      type: String,
      required: true,
    },

    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },

    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },

    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },

    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },

    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },

    email: {
      type: String,
    },

    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },

    paidAt: {
      type: Date,
    },

    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },

    deliveredAt: {
      type: Date,
    },

    // ✅ New fields for frontend safety
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "completed", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "succeeded"],
      default: "pending",
    },

    // Promo code fields
    appliedPromoCode: {
      type: String,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Prevent OverwriteModelError
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
