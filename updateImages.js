import mongoose from 'mongoose';
import itemModel from './Models/itemModel.js';
import fs from 'fs';

mongoose.connect('mongodb://localhost:27017/foodiefi')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function updateItemImages() {
  try {
    // Get all image files from uploads directory
    const imageFiles = fs.readdirSync('./uploads/').filter(file => 
      file.match(/\.(jpg|jpeg|png|gif)$/i) && !file.includes('profile')
    );
    
    console.log(`Found ${imageFiles.length} image files:`, imageFiles.slice(0, 10));
    
    // Get all items from database
    const items = await itemModel.find();
    console.log(`Found ${items.length} items in database`);
    
    // Update each item with a random image
    for (let i = 0; i < items.length; i++) {
      const randomImageFile = imageFiles[i % imageFiles.length];
      const imagePath = `/uploads/${randomImageFile}`;
      
      await itemModel.findByIdAndUpdate(items[i]._id, {
        imageUrl: imagePath
      });
      
      console.log(`Updated ${items[i].name} with image: ${imagePath}`);
    }
    
    console.log('All items updated with real image paths!');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error updating images:', error);
    mongoose.disconnect();
  }
}

updateItemImages();