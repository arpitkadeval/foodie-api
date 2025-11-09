import express from 'express';
import multer from 'multer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
  updatePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  refreshToken,
  logout
} from '../Controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Multer setup for profile picture uploads relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads/profile_pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination:', uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `profile-${uniqueSuffix}${ext}`;
    console.log('Multer filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer file filter:', file);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
// Accept multipart/form-data with field name 'profilePicture'
router.post('/register', upload.single('profilePicture'), registerUser);
router.post('/login', loginUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, upload.single('profilePicture'), updateUserProfile);
router.put('/profile-picture', authMiddleware, upload.single('profilePicture'), updateProfilePicture);
router.put('/password', authMiddleware, updatePassword);
router.post('/address', authMiddleware, addAddress);
router.put('/address/:addressId', authMiddleware, updateAddress);
router.delete('/address/:addressId', authMiddleware, deleteAddress);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;
