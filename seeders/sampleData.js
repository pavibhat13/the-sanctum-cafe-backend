const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
require('dotenv').config();

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@sanctumcafe.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1-555-0001',
    isActive: true
  },
  {
    name: 'John Employee',
    email: 'employee@sanctumcafe.com',
    password: 'employee123',
    role: 'employee',
    phone: '+1-555-0002',
    isActive: true
  },
  {
    name: 'Jane Customer',
    email: 'customer@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '+1-555-0003',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'Mike Delivery',
    email: 'delivery@sanctumcafe.com',
    password: 'delivery123',
    role: 'delivery',
    phone: '+1-555-0004',
    isActive: true
  }
];

const sampleMenuItems = [
  {
    name: 'Classic Burger',
    description: 'Juicy beef patty with lettuce, tomato, onion, and our special sauce',
    price: 12.99,
    category: 'main-course',
    image: '/images/classic-burger.jpg',
    ingredients: ['beef patty', 'lettuce', 'tomato', 'onion', 'special sauce', 'bun'],
    preparationTime: 15,
    isVegetarian: false,
    isVegan: false,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 85
  },
  {
    name: 'Veggie Delight Pizza',
    description: 'Fresh vegetables on a crispy crust with mozzarella cheese',
    price: 14.99,
    category: 'main-course',
    image: '/images/veggie-pizza.jpg',
    ingredients: ['pizza dough', 'tomato sauce', 'mozzarella', 'bell peppers', 'mushrooms', 'olives'],
    preparationTime: 20,
    isVegetarian: true,
    isVegan: false,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 72
  },
  {
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with parmesan cheese and croutons',
    price: 9.99,
    category: 'appetizer',
    image: '/images/caesar-salad.jpg',
    ingredients: ['romaine lettuce', 'parmesan cheese', 'croutons', 'caesar dressing'],
    preparationTime: 8,
    isVegetarian: true,
    isVegan: false,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 65
  },
  {
    name: 'Chocolate Brownie',
    description: 'Rich chocolate brownie served warm with vanilla ice cream',
    price: 6.99,
    category: 'dessert',
    image: '/images/chocolate-brownie.jpg',
    ingredients: ['chocolate', 'flour', 'butter', 'eggs', 'sugar', 'vanilla ice cream'],
    preparationTime: 5,
    isVegetarian: true,
    isVegan: false,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 78
  },
  {
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    price: 4.99,
    category: 'beverage',
    image: '/images/orange-juice.jpg',
    ingredients: ['fresh oranges'],
    preparationTime: 3,
    isVegetarian: true,
    isVegan: true,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 60
  },
  {
    name: 'Spicy Chicken Wings',
    description: 'Crispy chicken wings tossed in our signature hot sauce',
    price: 11.99,
    category: 'appetizer',
    image: '/images/chicken-wings.jpg',
    ingredients: ['chicken wings', 'hot sauce', 'celery', 'blue cheese dip'],
    preparationTime: 18,
    isVegetarian: false,
    isVegan: false,
    spiceLevel: 'hot',
    isAvailable: true,
    popularity: 88
  },
  {
    name: 'Vegan Buddha Bowl',
    description: 'Quinoa bowl with roasted vegetables, avocado, and tahini dressing',
    price: 13.99,
    category: 'main-course',
    image: '/images/buddha-bowl.jpg',
    ingredients: ['quinoa', 'roasted vegetables', 'avocado', 'tahini dressing', 'chickpeas'],
    preparationTime: 12,
    isVegetarian: true,
    isVegan: true,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 55
  },
  {
    name: 'Iced Coffee',
    description: 'Cold brew coffee served over ice with milk',
    price: 3.99,
    category: 'beverage',
    image: '/images/iced-coffee.jpg',
    ingredients: ['cold brew coffee', 'ice', 'milk'],
    preparationTime: 2,
    isVegetarian: true,
    isVegan: false,
    spiceLevel: 'mild',
    isAvailable: true,
    popularity: 70
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const users = await User.create(sampleUsers);
    console.log(`Created ${users.length} users`);

    // Create menu items
    const menuItems = await MenuItem.create(sampleMenuItems);
    console.log(`Created ${menuItems.length} menu items`);

    // Create a sample order
    const customer = users.find(u => u.role === 'customer');
    const burger = menuItems.find(m => m.name === 'Classic Burger');
    const salad = menuItems.find(m => m.name === 'Caesar Salad');

    const sampleOrder = new Order({
      customer: customer._id,
      items: [
        {
          menuItem: burger._id,
          quantity: 2,
          price: burger.price,
          specialInstructions: 'No onions please'
        },
        {
          menuItem: salad._id,
          quantity: 1,
          price: salad.price
        }
      ],
      orderType: 'dine-in',
      tableNumber: 5,
      paymentMethod: 'card',
      subtotal: (burger.price * 2) + salad.price,
      tax: ((burger.price * 2) + salad.price) * 0.08,
      deliveryFee: 0,
      total: ((burger.price * 2) + salad.price) * 1.08,
      status: 'delivered',
      paymentStatus: 'paid',
      orderNumber: 1001
    });

    await sampleOrder.save();
    console.log('Created sample order');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSample login credentials:');
    console.log('Admin: admin@sanctumcafe.com / admin123');
    console.log('Employee: employee@sanctumcafe.com / employee123');
    console.log('Customer: customer@example.com / customer123');
    console.log('Delivery: delivery@sanctumcafe.com / delivery123');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;