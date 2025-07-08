const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function updateCustomerPhones() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all customers without phone numbers
    const customersWithoutPhone = await User.find({
      role: 'customer',
      $or: [
        { phone: { $exists: false } },
        { phone: null },
        { phone: '' }
      ]
    });

    console.log(`Found ${customersWithoutPhone.length} customers without phone numbers`);

    // Update customers with sample phone numbers
    for (let i = 0; i < customersWithoutPhone.length; i++) {
      const customer = customersWithoutPhone[i];
      // Generate a unique phone number starting with 9876543210 + index
      const phoneNumber = `987654${(3210 + i).toString().padStart(4, '0')}`;
      
      customer.phone = phoneNumber;
      await customer.save();
      console.log(`Updated customer ${customer.name} with phone: ${phoneNumber}`);
    }

    // Create a sample customer with known credentials for testing
    const existingTestCustomer = await User.findOne({ phone: '9876543210', role: 'customer' });
    if (!existingTestCustomer) {
      const testCustomer = new User({
        name: 'Test Customer',
        phone: '9876543210',
        password: 'customer123',
        role: 'customer'
      });
      await testCustomer.save();
      console.log('Created test customer with phone: 9876543210, password: customer123');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the migration
updateCustomerPhones();