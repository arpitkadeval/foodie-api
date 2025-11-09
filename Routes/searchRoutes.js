import express from 'express';
import {
  searchProducts,
  getSearchSuggestions,
  getFilterOptions
} from '../Controllers/searchController.js';

const router = express.Router();

// Search products
router.get('/products', searchProducts);

// Get search suggestions
router.get('/suggestions', getSearchSuggestions);

// Get filter options
router.get('/filters', getFilterOptions);

export default router;
