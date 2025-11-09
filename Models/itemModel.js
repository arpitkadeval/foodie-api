import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', required: true },
  price: { type: Number, required: true, default: 0 },
  rating: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  hearts: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  imageUrl: { type: String },
  specialOffer: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  images: [{ type: String }],
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Item', itemSchema);
