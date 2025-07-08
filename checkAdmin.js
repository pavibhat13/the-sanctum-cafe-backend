const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@sanctumcafe.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('- ID:', adminUser._id);
    console.log('- Name:', adminUser.name);
    console.log('- Email:', adminUser.email);
    console.log('- Role:', adminUser.role);
    console.log('- Active:', adminUser.isActive);
    console.log('- Password hash exists:', !!adminUser.password);
    console.log('- Password hash length:', adminUser.password?.length);

    // Test password comparison
    const testPassword = 'admin123';
    const isPasswordValid = await adminUser.comparePassword(testPassword);
    console.log('- Password test (admin123):', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    // Test with wrong password
    const wrongPasswordTest = await adminUser.comparePassword('wrongpassword');
    console.log('- Wrong password test:', wrongPasswordTest ? '❌ Should be false' : '✅ Correctly rejected');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

checkAdmin();