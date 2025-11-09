import mongoose from 'mongoose';
import itemModel from './Models/itemModel.js';

mongoose.connect('mongodb://localhost:27017/foodiefi')
  .then(() => console.log('Connected'))
  .catch(err => console.error('Connection error:', err));

async function checkImages() {
  try {
    const item = await itemModel.findOne();
    console.log('Sample item image paths:');
    console.log('imageUrl:', item?.imageUrl);
    console.log('image:', item?.image);
    console.log('\nFull item data:');
    console.log(JSON.stringify(item, null, 2));
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkImages();