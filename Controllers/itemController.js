import itemModel from '../Models/itemModel.js';

export const createItem = async (req, res, next) => {
  try {
    const { name, description, category, price, rating, hearts, specialOffer, stock } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const total = Number(price) * 1;

    const newItem = new itemModel({
      name,
      description,
      category,
      price: Number(price),
      rating: Number(rating),
      hearts: Number(hearts),
      specialOffer: Number(specialOffer) || 0,
      stock: Number(stock) || 0,
      imageUrl,
      total: Number(total)
    });

    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'Item name already exists' });
    } else {
      next(err);
    }
  }
};

export const getItems = async (req, res, next) => {
  try {
    const items = await itemModel.find().populate('category', 'name').sort({ createdAt: -1 });
    const host = `${req.protocol}://${req.get('host')}`;

    const withFullUrl = items.map(i => ({
      ...i.toObject(),
      imageUrl: i.imageUrl ? host + i.imageUrl : ''
    }));

    res.json(withFullUrl);
  } catch (err) {
    next(err);
  }
};

export const getSpecialOffers = async (req, res, next) => {
  try {
    const offers = await itemModel.find({ specialOffer: { $gt: 0 } }).populate('category', 'name').sort({ createdAt: -1 });
    const host = `${req.protocol}://${req.get('host')}`;

    const withFullUrl = offers.map(i => ({
      ...i.toObject(),
      imageUrl: i.imageUrl ? host + i.imageUrl : ''
    }));

    res.json(withFullUrl);
  } catch (err) {
    next(err);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const removed = await itemModel.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Item not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// Update item
export const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, rating, hearts, specialOffer, stock, isActive } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updateData = {
      name,
      description,
      category,
      price: Number(price),
      rating: Number(rating),
      hearts: Number(hearts),
      specialOffer: Number(specialOffer) || 0,
      stock: Number(stock) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    };

    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const updatedItem = await itemModel.findByIdAndUpdate(id, updateData, { new: true }).populate('category', 'name');
    
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const response = {
      ...updatedItem.toObject(),
      imageUrl: updatedItem.imageUrl ? host + updatedItem.imageUrl : ''
    };

    res.json(response);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'Item name already exists' });
    } else {
      next(err);
    }
  }
};

// Get single item by ID
export const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await itemModel.findById(id).populate('category', 'name');
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const response = {
      ...item.toObject(),
      imageUrl: item.imageUrl ? host + item.imageUrl : ''
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};

// Update stock for an item
export const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stock, operation } = req.body; // operation can be 'set', 'add', or 'subtract'
    
    const item = await itemModel.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let newStock;
    switch (operation) {
      case 'add':
        newStock = item.stock + Number(stock);
        break;
      case 'subtract':
        newStock = Math.max(0, item.stock - Number(stock));
        break;
      case 'set':
      default:
        newStock = Number(stock);
        break;
    }

    const updatedItem = await itemModel.findByIdAndUpdate(
      id,
      { stock: newStock },
      { new: true }
    ).populate('category', 'name');

    res.json({ 
      message: 'Stock updated successfully', 
      item: updatedItem,
      previousStock: item.stock,
      newStock: newStock
    });
  } catch (err) {
    next(err);
  }
};

// Stock validation utility functions
export const isInStock = (item) => {
  return item && item.stock > 0;
};

export const checkStockAvailability = (item, requestedQuantity) => {
  if (!item) return { available: false, message: 'Item not found' };
  if (item.stock <= 0) return { available: false, message: 'Item is out of stock' };
  if (item.stock < requestedQuantity) {
    return { 
      available: false, 
      message: `Only ${item.stock} items available, but ${requestedQuantity} requested` 
    };
  }
  return { available: true, message: 'Stock available' };
};

// Get out of stock items
export const getOutOfStockItems = async (req, res, next) => {
  try {
    const outOfStockItems = await itemModel.find({ stock: 0 }).populate('category', 'name').sort({ createdAt: -1 });
    const host = `${req.protocol}://${req.get('host')}`;

    const withFullUrl = outOfStockItems.map(i => ({
      ...i.toObject(),
      imageUrl: i.imageUrl ? host + i.imageUrl : ''
    }));

    res.json(withFullUrl);
  } catch (err) {
    next(err);
  }
};

// Get stock for a specific item
export const getItemStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await itemModel.findById(id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found' 
      });
    }

    res.json({ 
      success: true,
      itemId: item._id,
      itemName: item.name,
      stock: item.stock,
      isInStock: item.stock > 0
    });
  } catch (err) {
    next(err);
  }
};

// Bulk stock check for multiple items
export const checkBulkStock = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of {itemId, quantity}
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const stockResults = [];
    
    for (const { itemId, quantity } of items) {
      const item = await itemModel.findById(itemId);
      
      if (!item) {
        stockResults.push({
          itemId,
          itemName: 'Unknown',
          requestedQuantity: quantity,
          availableStock: 0,
          isValid: false,
          message: 'Item not found'
        });
        continue;
      }

      const isValid = item.stock >= quantity;
      stockResults.push({
        itemId: item._id,
        itemName: item.name,
        requestedQuantity: quantity,
        availableStock: item.stock,
        isValid,
        message: isValid ? 'Stock available' : `Only ${item.stock} available, but ${quantity} requested`
      });
    }

    res.json({
      success: true,
      results: stockResults
    });
  } catch (err) {
    next(err);
  }
};

// Update stock after order (bulk operation)
export const updateStockAfterOrder = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of {itemId, quantity}
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const updateResults = [];
    
    for (const { itemId, quantity } of items) {
      const item = await itemModel.findById(itemId);
      
      if (!item) {
        updateResults.push({
          itemId,
          success: false,
          message: 'Item not found'
        });
        continue;
      }

      if (item.stock < quantity) {
        updateResults.push({
          itemId,
          itemName: item.name,
          success: false,
          message: `Insufficient stock: only ${item.stock} available, but ${quantity} requested`
        });
        continue;
      }

      const newStock = Math.max(0, item.stock - quantity);
      await itemModel.findByIdAndUpdate(itemId, { stock: newStock });
      
      updateResults.push({
        itemId,
        itemName: item.name,
        success: true,
        previousStock: item.stock,
        newStock: newStock,
        quantityDeducted: quantity
      });
    }

    res.json({
      success: true,
      message: 'Stock update completed',
      results: updateResults
    });
  } catch (err) {
    next(err);
  }
};

// Get item count
export const getItemCount = async (req, res) => {
  try {
    const count = await itemModel.countDocuments();
    res.status(200).json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching item count', error: err.message });
  }
};
