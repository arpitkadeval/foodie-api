import mongoose from 'mongoose';
import itemModel from '../Models/itemModel.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/foodiefi')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkItems() {
  try {
    console.log('Checking items in database...');
    
    const items = await itemModel.find({});
    console.log('Total items found:', items.length);
    
    if (items.length > 0) {
      console.log('Sample item:', JSON.stringify(items[0], null, 2));
    } else {
      console.log('No items found in database');
      
      // Let's also check categories
      const categoryModel = mongoose.model('category');
      const categories = await categoryModel.find({});
      console.log('Total categories found:', categories.length);
      
      if (categories.length === 0) {
        console.log('No categories found either. Database might be empty.');
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error checking items:', error);
    mongoose.disconnect();
  }
}

checkItems();