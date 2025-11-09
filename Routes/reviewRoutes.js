import express from 'express';
import {
  addReview,
  getItemReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markHelpful
} from '../Controllers/reviewController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/item/:itemId', getItemReviews);

// Protected routes
router.post('/', authMiddleware, addReview);
router.post('/add', authMiddleware, addReview);
router.get('/user', authMiddleware, getUserReviews);
router.put('/:reviewId', authMiddleware, updateReview);
router.delete('/:reviewId', authMiddleware, deleteReview);
router.post('/:reviewId/helpful', authMiddleware, markHelpful);

export default router;
