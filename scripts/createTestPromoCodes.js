import mongoose from 'mongoose';
import PromoCode from '../Models/PromoCodeModel.js';
import dotenv from 'dotenv';

dotenv.config();

const createTestPromoCodes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodiefi');
    console.log('Connected to MongoDB');

    // Clear existing promo codes
    await PromoCode.deleteMany({});
    console.log('Cleared existing promo codes');

    // Create test promo codes
    const testPromoCodes = [
      {
        code: 'WELCOME10',
        description: 'Welcome discount - 10% off on your first order',
        discountType: 'percentage',
        discountValue: 10,
        minimumOrderValue: 100,
        maximumDiscount: 200,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        usageLimit: 1000,
        usedCount: 0,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      },
      {
        code: 'SAVE50',
        description: 'Flat ₹50 off on orders above ₹300',
        discountType: 'fixed',
        discountValue: 50,
        minimumOrderValue: 300,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        usageLimit: 500,
        usedCount: 0,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on all orders',
        discountType: 'free_shipping',
        discountValue: 0,
        minimumOrderValue: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        usageLimit: null, // Unlimited
        usedCount: 0,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      }
    ];

    // Insert promo codes
    const createdPromoCodes = await PromoCode.insertMany(testPromoCodes);
    console.log(`Created ${createdPromoCodes.length} test promo codes:`);
    
    createdPromoCodes.forEach(promo => {
      console.log(`- ${promo.code}: ${promo.description}`);
    });

    console.log('\nTest promo codes created successfully!');
    console.log('You can now test with these codes:');
    console.log('- WELCOME10 (10% off, min ₹100)');
    console.log('- SAVE50 (₹50 off, min ₹300)');
    console.log('- FREESHIP (Free shipping)');

  } catch (error) {
    console.error('Error creating test promo codes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
createTestPromoCodes();
