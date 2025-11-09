import mongoose from 'mongoose';
import categoryModel from './Models/categoryModel.js';
import itemModel from './Models/itemModel.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/foodiefi')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Sample categories
const categories = [
  'Breakfast',
  'Dinner', 
  'Dessert',
  'Appetizers',
  'Main Course',
  'Beverages',
  'Snacks'
];

// Sample menu items
const sampleItems = [
  {
    name: 'Vada Pav',
    description: 'Mumbai famous street food with spicy potato fritter in a bun',
    category: 'Breakfast',
    price: 25,
    rating: 4.5,
    averageRating: 4.5,
    reviewCount: 120,
    hearts: 85,
    specialOffer: 10,
    stock: 50,
    imageUrl: '/uploads/vada-pav.jpg',
    tags: ['street food', 'mumbai', 'spicy'],
    isActive: true
  },
  {
    name: 'Cheese Cake',
    description: 'Rich and creamy New York style cheesecake',
    category: 'Dessert',
    price: 180,
    rating: 4.8,
    averageRating: 4.8,
    reviewCount: 95,
    hearts: 92,
    specialOffer: 0,
    stock: 25,
    imageUrl: '/uploads/cheese-cake.jpg',
    tags: ['dessert', 'sweet', 'cream'],
    isActive: true
  },
  {
    name: 'Pan Cake',
    description: 'Fluffy pancakes served with maple syrup and butter',
    category: 'Breakfast',
    price: 120,
    rating: 4.3,
    averageRating: 4.3,
    reviewCount: 78,
    hearts: 71,
    specialOffer: 15,
    stock: 30,
    imageUrl: '/uploads/pan-cake.jpg',
    tags: ['breakfast', 'sweet', 'fluffy'],
    isActive: true
  },
  {
    name: 'Avocado Toast',
    description: 'Fresh avocado on toasted artisan bread with cherry tomatoes',
    category: 'Breakfast',
    price: 150,
    rating: 4.6,
    averageRating: 4.6,
    reviewCount: 64,
    hearts: 88,
    specialOffer: 0,
    stock: 20,
    imageUrl: '/uploads/avocado-toast.jpg',
    tags: ['healthy', 'breakfast', 'avocado'],
    isActive: true
  },
  {
    name: 'Masala Dhosa',
    description: 'Crispy South Indian crepe filled with spiced potato',
    category: 'Breakfast',
    price: 80,
    rating: 4.4,
    averageRating: 4.4,
    reviewCount: 156,
    hearts: 79,
    specialOffer: 5,
    stock: 40,
    imageUrl: '/uploads/masala-dosa.jpg',
    tags: ['south indian', 'crispy', 'traditional'],
    isActive: true
  },
  {
    name: 'Idli',
    description: 'Steamed rice and lentil cakes served with sambar and chutney',
    category: 'Breakfast',
    price: 60,
    rating: 4.2,
    averageRating: 4.2,
    reviewCount: 89,
    hearts: 65,
    specialOffer: 0,
    stock: 35,
    imageUrl: '/uploads/idli.jpg',
    tags: ['south indian', 'healthy', 'steamed'],
    isActive: true
  },
  {
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice cooked with tender chicken and spices',
    category: 'Dinner',
    price: 220,
    rating: 4.7,
    averageRating: 4.7,
    reviewCount: 234,
    hearts: 91,
    specialOffer: 12,
    stock: 45,
    imageUrl: '/uploads/chicken-biryani.jpg',
    tags: ['biryani', 'chicken', 'aromatic'],
    isActive: true
  },
  {
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella, tomato sauce and basil',
    category: 'Main Course',
    price: 280,
    rating: 4.5,
    averageRating: 4.5,
    reviewCount: 187,
    hearts: 83,
    specialOffer: 20,
    stock: 30,
    imageUrl: '/uploads/margherita-pizza.jpg',
    tags: ['pizza', 'italian', 'cheese'],
    isActive: true
  },
  {
    name: 'Samosa',
    description: 'Crispy triangular pastry filled with spiced potatoes and peas',
    category: 'Snacks',
    price: 15,
    rating: 4.1,
    averageRating: 4.1,
    reviewCount: 98,
    hearts: 67,
    specialOffer: 0,
    stock: 60,
    imageUrl: '/uploads/samosa.jpg',
    tags: ['snacks', 'crispy', 'traditional'],
    isActive: true
  },
  {
    name: 'Mango Lassi',
    description: 'Refreshing yogurt drink blended with sweet mango',
    category: 'Beverages',
    price: 45,
    rating: 4.4,
    averageRating: 4.4,
    reviewCount: 112,
    hearts: 76,
    specialOffer: 8,
    stock: 25,
    imageUrl: '/uploads/mango-lassi.jpg',
    tags: ['drink', 'mango', 'refreshing'],
    isActive: true
  },
  {
    name: 'Chocolate Brownie',
    description: 'Rich and fudgy chocolate brownie served with vanilla ice cream',
    category: 'Dessert',
    price: 120,
    rating: 4.6,
    averageRating: 4.6,
    reviewCount: 143,
    hearts: 87,
    specialOffer: 15,
    stock: 20,
    imageUrl: '/uploads/chocolate-brownie.jpg',
    tags: ['chocolate', 'dessert', 'fudgy'],
    isActive: true
  },
  {
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with parmesan cheese and croutons',
    category: 'Appetizers',
    price: 140,
    rating: 4.3,
    averageRating: 4.3,
    reviewCount: 67,
    hearts: 72,
    specialOffer: 0,
    stock: 15,
    imageUrl: '/uploads/caesar-salad.jpg',
    tags: ['salad', 'healthy', 'fresh'],
    isActive: true
  }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await categoryModel.deleteMany({});
    await itemModel.deleteMany({});
    console.log('Cleared existing data');

    // Insert categories
    const categoryDocs = await categoryModel.insertMany(
      categories.map(name => ({ name }))
    );
    console.log('Categories inserted:', categoryDocs.length);

    // Create a mapping of category names to IDs
    const categoryMap = {};
    categoryDocs.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    // Insert items with proper category references
    const itemsWithCategoryIds = sampleItems.map(item => ({
      ...item,
      category: categoryMap[item.category],
      total: item.price // Set total to price initially
    }));

    const itemDocs = await itemModel.insertMany(itemsWithCategoryIds);
    console.log('Items inserted:', itemDocs.length);

    console.log('Database seeding completed successfully!');
    console.log('Categories:', categories.length);
    console.log('Menu items:', itemDocs.length);

    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.disconnect();
  }
}

seedDatabase();