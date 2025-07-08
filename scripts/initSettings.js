const mongoose = require('mongoose');
const { seedDefaultSettings } = require('../seeders/defaultSettings');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const initializeSettings = async () => {
  try {
    await connectDB();
    await seedDefaultSettings();
    console.log('🎉 Settings initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Settings initialization failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initializeSettings();
}

module.exports = { initializeSettings };