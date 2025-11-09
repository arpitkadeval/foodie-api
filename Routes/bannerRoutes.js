import express from 'express';
const router = express.Router();
import multer from 'multer';
import path from 'path';
import { createBanner, getAllBanners, deleteBanner } from '../Controllers/bannerController.js';

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/banners');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Routes
router.post('/', upload.single('image'), createBanner);
router.get('/list', getAllBanners);
router.delete('/:id', deleteBanner);

export default router;

