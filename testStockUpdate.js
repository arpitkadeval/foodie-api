import mongoose from 'mongoose';
import itemModel from './Models/itemModel.js';

// Test script to set some items as out of stock for demonstration purposes
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/FoodieFi', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const updateStockForTesting = async () => {
  try {
    await connectDB();
    
    // Get all items
    const items = await itemModel.find();
    console.log(`Found ${items.length} items`);
    
    // Set some random items to different stock levels for testing
    const updates = [];
    
    for (let i = 0; i < items.length; i++) {
      let stock;
      
      // Create a mix of stock levels
      if (i % 5 === 0) {
        stock = 0; // Out of stock
      } else if (i % 4 === 0) {
        stock = Math.floor(Math.random() * 5) + 1; // Low stock (1-5)
      } else if (i % 3 === 0) {
        stock = Math.floor(Math.random() * 10) + 6; // Medium stock (6-15)
      } else {
        stock = Math.floor(Math.random() * 50) + 20; // High stock (20-70)
      }
      
      updates.push({
        updateOne: {
          filter: { _id: items[i]._id },
          update: { $set: { stock: stock } }
        }
      });
    }
    
    // Perform bulk update
    const result = await itemModel.bulkWrite(updates);
    console.log('Stock update results:', result);
    
    // Show some examples
    const updatedItems = await itemModel.find().select('name stock').limit(10);
    console.log('\nSample updated items:');
    updatedItems.forEach(item => {
      console.log(`${item.name}: ${item.stock} in stock`);
    });
    
    // Show out of stock items
    const outOfStockItems = await itemModel.find({ stock: 0 }).select('name stock');
    console.log(`\nOut of stock items (${outOfStockItems.length}):`);
    outOfStockItems.forEach(item => {
      console.log(`- ${item.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating stock:', error);
    process.exit(1);
  }
};

// Run the test
updateStockForTesting();