import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  emailAddress: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  dishName: {
    type: String,
    required: true,
  },
  yourQuery: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const contactModel = mongoose.models.contact || mongoose.model('contact', contactSchema);
export default contactModel;
