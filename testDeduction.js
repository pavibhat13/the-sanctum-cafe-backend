require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Inventory = require('./models/Inventory');
const InventoryService = require('./services/inventoryService');

async function testDeduction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the burger
    const burger = await MenuItem.findOne({ name: { $regex: /burger/i } });
    if (!burger) {
      console.log('❌ No burger found');
      return;
    }

    console.log(`\n🍔 Testing deduction for: ${burger.name}`);
    console.log('Main ingredients:', burger.mainIngredients);

    // Check inventory before deduction
    console.log('\n📦 Inventory BEFORE deduction:');
    for (const mainIng of burger.mainIngredients) {
      const inventoryItem = await Inventory.findOne({ 
        name: { $regex: new RegExp(`^${mainIng.name}$`, 'i') },
        isActive: true 
      });
      if (inventoryItem) {
        console.log(`- ${inventoryItem.name}: ${inventoryItem.currentStock} ${inventoryItem.unit}`);
      }
    }

    // Simulate order items (like what comes from the order)
    const orderItems = [{
      menuItem: burger._id,
      quantity: 1 // Order 1 burger
    }];

    console.log('\n🔄 Performing inventory deduction...');
    const result = await InventoryService.deductMainIngredients(orderItems);

    console.log('\n📊 Deduction Result:');
    console.log('Success:', result.success);
    console.log('Deductions:', result.deductions.length);
    console.log('Errors:', result.errors.length);

    if (result.deductions.length > 0) {
      console.log('\n✅ Successful deductions:');
      result.deductions.forEach(deduction => {
        console.log(`- ${deduction.ingredient}: ${deduction.quantityDeducted} ${deduction.unit} (${deduction.previousStock} → ${deduction.newStock})`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`- ${error.ingredient}: ${error.error}`);
      });
    }

    // Check inventory after deduction
    console.log('\n📦 Inventory AFTER deduction:');
    for (const mainIng of burger.mainIngredients) {
      const inventoryItem = await Inventory.findOne({ 
        name: { $regex: new RegExp(`^${mainIng.name}$`, 'i') },
        isActive: true 
      });
      if (inventoryItem) {
        console.log(`- ${inventoryItem.name}: ${inventoryItem.currentStock} ${inventoryItem.unit}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testDeduction();