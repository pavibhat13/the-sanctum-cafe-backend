const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createDefaultUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create default users if they don't exist
    const defaultUsers = [
      {
        name: 'Admin User',
        email: 'admin@sanctumcafe.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        name: 'Employee User',
        email: 'employee@sanctumcafe.com',
        password: 'employee123',
        role: 'employee',
        department: 'Kitchen'
      },
      {
        name: 'Delivery Person',
        email: 'delivery@sanctumcafe.com',
        password: 'delivery123',
        role: 'delivery',
        department: 'Delivery'
      }
    ];

    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Created ${userData.role} user: ${userData.email}`);
      } else {
        console.log(`${userData.role} user already exists: ${userData.email}`);
      }
    }

    console.log('Default users creation completed');
  } catch (error) {
    console.error('Failed to create default users:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the migration
createDefaultUsers();