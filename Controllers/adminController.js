import orderModel from '../Models/OrderModel.js';
import userModel from '../Models/enhancedUserModel.js';
import itemModel from '../Models/itemModel.js';
import reviewModel from '../Models/ReviewModel.js';
import mongoose from 'mongoose';

// Get sales overview
export const getSalesOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Total sales
    const totalSales = await orderModel.aggregate([
      { $match: { ...dateFilter, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Total orders
    const totalOrders = await orderModel.countDocuments({ ...dateFilter });

    // Total customers
    const totalCustomers = await userModel.countDocuments({ role: 'user' });

    // Average order value
    const avgOrderValue = totalSales.length > 0 
      ? totalSales[0].total / totalOrders 
      : 0;

    // Monthly sales
    const monthlySales = await orderModel.aggregate([
      { $match: { ...dateFilter, status: 'delivered' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top selling items
    const topSellingItems = await orderModel.aggregate([
      { $match: { ...dateFilter, status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item'
        }
      },
      { $unwind: '$item' },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSales: totalSales[0]?.total || 0,
        totalOrders,
        totalCustomers,
        avgOrderValue,
        monthlySales,
        topSellingItems
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sales overview',
      error: error.message
    });
  }
};

// Get order analytics
export const getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Order status distribution
    const orderStatus = await orderModel.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily orders
    const dailyOrders = await orderModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Payment method distribution
    const paymentMethods = await orderModel.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        orderStatus,
        dailyOrders,
        paymentMethods
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order analytics',
      error: error.message
    });
  }
};

// Get customer analytics
export const getCustomerAnalytics = async (req, res) => {
  try {
    // New customers by month
    const newCustomers = await userModel.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top customers by order value
    const topCustomers = await orderModel.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          orderCount: 1,
          customerName: '$customer.username',
          customerEmail: '$customer.email'
        }
      }
    ]);

    // Customer retention rate
    const totalCustomers = await userModel.countDocuments({ role: 'user' });
    const customersWithOrders = await orderModel.distinct('userId');

    const retentionRate = (customersWithOrders.length / totalCustomers) * 100;

    res.status(200).json({
      success: true,
      data: {
        newCustomers,
        topCustomers,
        retentionRate: Math.round(retentionRate * 100) / 100
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customer analytics',
      error: error.message
    });
  }
};

// Get product analytics
export const getProductAnalytics = async (req, res) => {
  try {
    // Top rated products
    const topRatedProducts = await itemModel.find()
      .sort({ averageRating: -1 })
      .limit(10)
      .select('name images price averageRating reviewCount');

    // Most reviewed products
    const mostReviewedProducts = await itemModel.find()
      .sort({ reviewCount: -1 })
      .limit(10)
      .select('name images price averageRating reviewCount');

    // Low stock products
    const lowStockProducts = await itemModel.find({ stock: { $lt: 10 } })
      .sort({ stock: 1 })
      .select('name images price stock');

    // Product performance
    const productPerformance = await orderModel.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        topRatedProducts,
        mostReviewedProducts,
        lowStockProducts,
        productPerformance
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product analytics',
      error: error.message
    });
  }
};

// Get revenue report
export const getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let groupByFormat;
    switch (groupBy) {
      case 'day':
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        groupByFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      case 'year':
        groupByFormat = {
          year: { $year: '$createdAt' }
        };
        break;
    }

    const revenueData = await orderModel.aggregate([
      { $match: { ...dateFilter, status: 'delivered' } },
      {
        $group: {
          _id: groupByFormat,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: revenueData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue report',
      error: error.message
    });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Today's stats
    const todayOrders = await orderModel.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const todayRevenue = await orderModel.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay }, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Pending orders
    const pendingOrders = await orderModel.countDocuments({ status: 'pending' });

    // Low stock alerts
    const lowStockCount = await itemModel.countDocuments({ stock: { $lt: 10 } });

    // Recent orders
    const recentOrders = await orderModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'username email')
      .select('orderId totalAmount status createdAt');

    res.status(200).json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        pendingOrders,
        lowStockCount,
        recentOrders
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

export default {
  getSalesOverview,
  getOrderAnalytics,
  getCustomerAnalytics,
  getProductAnalytics,
  getRevenueReport,
  getDashboardStats
};
