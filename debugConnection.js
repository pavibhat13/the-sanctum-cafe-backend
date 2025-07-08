const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
require('dotenv').config();

async function debugConnection() {
  try {
    // Connect using the same logic as server.js
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe';
    console.log('Connecting to:', connectionString);
    
    await mongoose.connect(connectionString);
    console.log('✅ Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Connection ready state:', mongoose.connection.readyState);

    // Test the exact same query as the API
    const filter = { isAvailable: true };
    console.log('Testing filter:', filter);
    
    const items = await MenuItem.find(filter);
    console.log(`Found ${items.length} items with filter`);
    
    // Test without filter
    const allItems = await MenuItem.find({});
    console.log(`Found ${allItems.length} total items`);
    
    if (allItems.length > 0) {
      console.log('First item:', {
        name: allItems[0].name,
        isAvailable: allItems[0].isAvailable,
        _id: allItems[0]._id
      });
    }

  } catch (error) {
    console.error('Connection debug error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

debugConnection();