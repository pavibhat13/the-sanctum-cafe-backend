const mongoose = require('mongoose');
const Settings = require('../models/Settings');

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

const testSettings = async () => {
  try {
    await connectDB();
    
    console.log('\n📋 Testing Settings Functionality...\n');
    
    // Test 1: Check if business settings exist
    console.log('1️⃣ Checking existing business settings...');
    const businessSettings = await Settings.find({ category: 'business' });
    console.log(`Found ${businessSettings.length} business settings:`);
    businessSettings.forEach(setting => {
      console.log(`   - ${setting.key}: ${JSON.stringify(setting.value)}`);
    });
    
    // Test 2: Update business phone
    console.log('\n2️⃣ Testing business phone update...');
    const newPhone = '(555) 999-TEST';
    await Settings.findOneAndUpdate(
      { category: 'business', key: 'phone' },
      { category: 'business', key: 'phone', value: newPhone },
      { upsert: true, new: true }
    );
    console.log(`✅ Phone updated to: ${newPhone}`);
    
    // Test 3: Update business email
    console.log('\n3️⃣ Testing business email update...');
    const newEmail = 'test@sanctumcafe.com';
    await Settings.findOneAndUpdate(
      { category: 'business', key: 'email' },
      { category: 'business', key: 'email', value: newEmail },
      { upsert: true, new: true }
    );
    console.log(`✅ Email updated to: ${newEmail}`);
    
    // Test 4: Update business address
    console.log('\n4️⃣ Testing business address update...');
    const newAddress = '456 Test Avenue, Test City, TC 67890';
    await Settings.findOneAndUpdate(
      { category: 'business', key: 'address' },
      { category: 'business', key: 'address', value: newAddress },
      { upsert: true, new: true }
    );
    console.log(`✅ Address updated to: ${newAddress}`);
    
    // Test 5: Verify all updates
    console.log('\n5️⃣ Verifying all updates...');
    const updatedSettings = await Settings.find({ category: 'business' });
    console.log('Updated business settings:');
    updatedSettings.forEach(setting => {
      console.log(`   - ${setting.key}: ${JSON.stringify(setting.value)}`);
    });
    
    // Test 6: Test settings retrieval in API format
    console.log('\n6️⃣ Testing API format retrieval...');
    const allSettings = await Settings.find({});
    const settingsObj = {};
    allSettings.forEach(setting => {
      if (!settingsObj[setting.category]) {
        settingsObj[setting.category] = {};
      }
      settingsObj[setting.category][setting.key] = setting.value;
    });
    
    console.log('Settings in API format:');
    console.log('Business info:', JSON.stringify(settingsObj.business, null, 2));
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Run if called directly
if (require.main === module) {
  testSettings();
}

module.exports = { testSettings };