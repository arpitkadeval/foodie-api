import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
