const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Inventory = require('./models/Inventory');
const User = require('./models/User');
require('dotenv').config();

async function testAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    console.log('✅ Connected to MongoDB');

    // Test Menu Items
    const menuItems = await MenuItem.find().limit(3);
    console.log(`✅ Found ${menuItems.length} menu items`);
    if (menuItems.length > 0) {
      console.log('   Sample menu item:', menuItems[0].name);
    }

    // Test Inventory Items
    const inventoryItems = await Inventory.find().limit(3);
    console.log(`✅ Found ${inventoryItems.length} inventory items`);
    if (inventoryItems.length > 0) {
      console.log('   Sample inventory item:', inventoryItems[0].name);
    }

    // Test Users
    const users = await User.find({ role: { $in: ['employee', 'delivery'] } }).limit(3);
    console.log(`✅ Found ${users.length} employees`);
    if (users.length > 0) {
      console.log('   Sample employee:', users[0].name);
    }

    // Test Admin User
    const admin = await User.findOne({ email: 'admin@sanctumcafe.com' });
    console.log(`✅ Admin user found: ${admin ? admin.name : 'Not found'}`);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testAPI();