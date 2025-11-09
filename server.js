import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import connectDB from './config/db.js';
import userRoutes from './Routes/userRoutes.js';
import itemRouter from './Routes/itemRoutes.js';
import cartRoutes from './Routes/cartRoutes.js';
import orderRouter from './Routes/OrderRoutes.js';
import categoryRoutes from './Routes/categoryRoutes.js';
import userManagementRoutes from './Routes/userManagementRoutes.js';
import contactRoutes from './Routes/contactRoutes.js';
import bannerRoutes from './Routes/bannerRoutes.js';
import paymentRoutes from './Routes/paymentRoutes.js';
import authRoutes from './Routes/authRoutes.js';
import { handleWebhook } from './Controllers/paymentController.js';
import reviewRoutes from './Routes/reviewRoutes.js';
import adminRoutes from './Routes/adminRoutes.js';
import searchRoutes from './Routes/searchRoutes.js';
import promoCodeRoutes from './Routes/promoCodeRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Stripe Webhook must be registered before body parsers to preserve raw body
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// MIDDLEWARE
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://your-production-domain.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use routes
app.use('/api/user', userRoutes);
app.use('/api/item', itemRouter);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRouter);
app.use('/api/category', categoryRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/promo', promoCodeRoutes);

import debugRoutes from './Routes/debugRoutes.js';
app.use('/api/debug', debugRoutes);

// ROUTES
app.get('/', (req, res) => {
  res.send('API WORKING');
});

app.listen(port, () => {
  console.log(`Server Started on http://localhost:${port}`);
});
