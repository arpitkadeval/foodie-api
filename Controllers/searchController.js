import Item from '../Models/itemModel.js';
import Category from '../Models/categoryModel.js';

// Search products with filters
export const searchProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      rating,
      sortBy,
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    // Text search
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating) {
      query.averageRating = { $gte: parseFloat(rating) };
    }

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Item.find(query)
        .populate('category', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Item.countDocuments(query)
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message
    });
  }
};

// Get search suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await Item.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name')
    .limit(5);

    res.json({
      success: true,
      suggestions: suggestions.map(item => item.name)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting search suggestions',
      error: error.message
    });
  }
};

// Get filter options
export const getFilterOptions = async (req, res) => {
  try {
    const categories = await Category.find().select('name');
    const priceRange = await Item.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map(cat => cat.name),
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting filter options',
      error: error.message
    });
  }
};

export default {
  searchProducts,
  getSearchSuggestions,
  getFilterOptions
};
