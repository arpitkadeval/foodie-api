import itemModel from '../Models/itemModel.js';
import categoryModel from '../Models/categoryModel.js';

// Advanced search with filters
export const searchProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      sortBy,
      page = 1,
      limit = 12,
      inStock,
      brand,
      dietary
    } = req.query;

    let query = {};

    // Text search
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
      ];
    }

    // Category filter
    if (category) {
      const categoryDoc = await categoryModel.findOne({ name: { $regex: category, $options: 'i' } });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Rating range
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) query.rating.$gte = parseFloat(minRating);
      if (maxRating) query.rating.$lte = parseFloat(maxRating);
    }

    // Stock filter
    if (inStock === 'true') {
      query.quantity = { $gt: 0 };
    }

    // Brand filter
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }

    // Dietary filter
    if (dietary) {
      query.dietary = { $in: dietary.split(',') };
    }

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions.price = 1;
        break;
      case 'price-high':
        sortOptions.price = -1;
        break;
      case 'rating':
        sortOptions.rating = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'oldest':
        sortOptions.createdAt = 1;
        break;
      case 'name':
        sortOptions.name = 1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const products = await itemModel.find(query)
      .populate('category', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await itemModel.countDocuments(query);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
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
      return res.status(200).json({
        success: true,
        suggestions: []
      });
    }

    // Get product suggestions
    const products = await itemModel.find({
      name: { $regex: query, $options: 'i' }
    })
    .select('name')
    .limit(5);

    // Get category suggestions
    const categories = await categoryModel.find({
      name: { $regex: query, $options: 'i' }
    })
    .select('name')
    .limit(3);

    const suggestions = [
      ...products.map(p => p.name),
      ...categories.map(c => c.name)
    ];

    res.status(200).json({
      success: true,
      suggestions
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
    const categories = await categoryModel.find().select('name');
    const brands = await itemModel.distinct('brand');
    const dietaryOptions = await itemModel.distinct('dietary');

    res.status(200).json({
      success: true,
      filters: {
        categories: categories.map(c => c.name),
        brands: brands.filter(b => b),
        dietary: dietaryOptions.filter(d => d)
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

// Get related products
export const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await itemModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const relatedProducts = await itemModel.find({
      category: product.category,
      _id: { $ne: productId }
    })
    .limit(4);

    res.status(200).json({
      success: true,
      relatedProducts
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting related products',
      error: error.message
    });
  }
};
