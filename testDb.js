const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
require('dotenv').config();

async function testDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanctum-cafe');
    console.log('Connected to MongoDB');

    // Count total menu items
    const count = await MenuItem.countDocuments();
    console.log(`Total menu items in database: ${count}`);

    // Get all menu items
    const items = await MenuItem.find({});
    console.log(`Found ${items.length} menu items:`);
    
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - $${item.price} - Available: ${item.isAvailable}`);
    });

    // Test the same query as the API
    const availableItems = await MenuItem.find({ isAvailable: true });
    console.log(`\nAvailable items: ${availableItems.length}`);

  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testDatabase();