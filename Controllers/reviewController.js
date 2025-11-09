import reviewModel from '../Models/ReviewModel.js';
import orderModel from '../Models/OrderModel.js';
import itemModel from '../Models/itemModel.js';
import userModel from '../Models/enhancedUserModel.js';
import mongoose from 'mongoose';

// Add review
export const addReview = async (req, res) => {
  try {
    const { itemId, orderId, rating, title, comment, images } = req.body;
    const userId = req.user?.userId || req.user?._id;

    // Validate input
    if (!itemId || !orderId || !rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if rating is valid
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if order exists and belongs to user
    // Ensure we match the correct field name from the Order model (user)
    const order = await orderModel.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to user'
      });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only review delivered orders'
      });
    }

    // Check if item exists in order
    // Determine how to match the item: by itemId (ObjectId) or by item name fallback
    const provided = String(itemId);
    const matchItemInOrder = (it) => {
      if (it.product && String(it.product) === provided) return true;
      if (it.itemId && String(it.itemId) === provided) return true;
      if (it.item && it.item._id && String(it.item._id) === provided) return true;
      if (it.item && it.item.name && it.item.name === provided) return true;
      if (it.name && it.name === provided) return true;
      return false;
    };
    const itemInOrder = (order.orderItems || order.items || []).some(matchItemInOrder);
    if (!itemInOrder) {
      return res.status(400).json({
        success: false,
        message: 'Item not found in this order'
      });
    }

    // Resolve a real Item _id to store in the review
    let resolvedItemId = itemId;
    const looksLikeObjectId = mongoose.Types.ObjectId.isValid(String(itemId));
    if (!looksLikeObjectId) {
      const byName = await itemModel.findOne({ name: provided });
      if (byName) {
        resolvedItemId = byName._id;
      }
    }

    // If still not a valid ObjectId after attempts, return error
    if (!mongoose.Types.ObjectId.isValid(String(resolvedItemId))) {
      return res.status(400).json({
        success: false,
        message: 'Item not found in database',
      });
    }

    // Check if user already reviewed this item for this order (after resolving ID)
    const existingReview = await reviewModel.findOne({ user: userId, item: resolvedItemId, order: orderId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this item for this order' });
    }

    // Create review
    const review = new reviewModel({
      user: userId,
      item: resolvedItemId,
      order: orderId,
      rating,
      title,
      comment,
      images: images || [],
      verifiedPurchase: true
    });

    await review.save();

    // Update item's average rating
    const allReviews = await reviewModel.find({ item: resolvedItemId });
    const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;

    await itemModel.findByIdAndUpdate(resolvedItemId, {
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: allReviews.length
    });

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review
    });

  } catch (error) {
    // Handle duplicate key (unique index) error gracefully
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this item for this order'
      });
    }
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message,
      stack: error.stack,
    });
  }
};

// Get reviews for an item
export const getItemReviews = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await reviewModel.find({ item: itemId })
      .populate('user', 'username profilePicture')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReviews = await reviewModel.countDocuments({ item: itemId });

    // Calculate rating distribution
    const ratingDistribution = await reviewModel.aggregate([
      { $match: { item: itemId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: page > 1
      },
      ratingDistribution
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Get user's reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await reviewModel.find({ user: userId })
      .populate('item', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReviews = await reviewModel.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user reviews',
      error: error.message
    });
  }
};

// Update review
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user.userId;

    const review = await reviewModel.findOne({ _id: reviewId, user: userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or does not belong to user'
      });
    }

    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    await review.save();

    // Update item's average rating
    const allReviews = await reviewModel.find({ item: review.item });
    const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;

    await itemModel.findByIdAndUpdate(review.item, {
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: allReviews.length
    });

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    const review = await reviewModel.findOne({ _id: reviewId, user: userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or does not belong to user'
      });
    }

    const itemId = review.item;
    await reviewModel.findByIdAndDelete(reviewId);

    // Update item's average rating
    const allReviews = await reviewModel.find({ item: itemId });
    const averageRating = allReviews.length > 0 
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
      : 0;

    await itemModel.findByIdAndUpdate(itemId, {
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: allReviews.length
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};

// Mark review as helpful
export const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.helpful += 1;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      helpful: review.helpful
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking review as helpful',
      error: error.message
    });
  }
};

export default {
  addReview,
  getItemReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markHelpful
};
