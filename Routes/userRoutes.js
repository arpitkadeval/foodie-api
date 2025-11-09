import express from 'express';
import multer from 'multer';
import { registerUser, loginUser, forgotPassword, resetPassword, getUserProfile, updateUserProfile, addAddress, updateAddress, deleteAddress, refreshToken, logout } from '../Controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Multer setup for profile picture uploads relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads/profile_pictures');
console.log('Upload Directory:', uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/register', upload.single('profilePicture'), registerUser);
router.post('/login', loginUser);
// Removed verify-email route as requested
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);
router.post('/address', authMiddleware, addAddress);
router.put('/address/:addressId', authMiddleware, updateAddress);
router.delete('/address/:addressId', authMiddleware, deleteAddress);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;
