const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Inventory = require('./models/Inventory');
const Order = require('./models/Order');
const InventoryService = require('./services/inventoryService');

async function testInventoryDeduction() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    console.log('Connected to MongoDB');

    // Create test inventory items
    console.log('\n1. Creating test inventory items...');
    
    const testInventoryItems = [
      {
        name: 'Burger Patty',
        category: 'meat',
        currentStock: 50,
        minStock: 10,
        maxStock: 100,
        unit: 'pieces',
        costPerUnit: 5.00,
        supplier: 'Test Supplier'
      },
      {
        name: 'Burger Bun',
        category: 'ingredients',
        currentStock: 30,
        minStock: 5,
        maxStock: 60,
        unit: 'pieces',
        costPerUnit: 1.50,
        supplier: 'Test Supplier'
      },
      {
        name: 'Coffee Beans',
        category: 'beverages',
        currentStock: 1000,
        minStock: 100,
        maxStock: 2000,
        unit: 'grams',
        costPerUnit: 0.05,
        supplier: 'Test Supplier'
      }
    ];

    // Clear existing test items and create new ones
    await Inventory.deleteMany({ supplier: 'Test Supplier' });
    const createdInventory = await Inventory.insertMany(testInventoryItems);
    console.log(`Created ${createdInventory.length} test inventory items`);

    // Create test menu item
    console.log('\n2. Creating test menu item...');
    
    await MenuItem.deleteOne({ name: 'Test Burger' });
    const testMenuItem = new MenuItem({
      name: 'Test Burger',
      description: 'A delicious test burger',
      price: 12.99,
      category: 'main-course',
      preparationTime: 15,
      ingredients: ['Burger Patty', 'Burger Bun', 'Lettuce', 'Tomato'],
      mainIngredients: [
        { name: 'Burger Patty', quantity: 1, unit: 'pieces' },
        { name: 'Burger Bun', quantity: 1, unit: 'pieces' }
      ],
      isAvailable: true
    });
    
    await testMenuItem.save();
    console.log('Created test menu item:', testMenuItem.name);

    // Test inventory deduction
    console.log('\n3. Testing inventory deduction...');
    
    const testOrderItems = [
      {
        menuItem: testMenuItem._id,
        quantity: 3 // Order 3 burgers
      }
    ];

    console.log('Before deduction - Inventory levels:');
    const beforeBurgerPatty = await Inventory.findOne({ name: 'Burger Patty' });
    const beforeBurgerBun = await Inventory.findOne({ name: 'Burger Bun' });
    console.log(`- Burger Patty: ${beforeBurgerPatty.currentStock} ${beforeBurgerPatty.unit}`);
    console.log(`- Burger Bun: ${beforeBurgerBun.currentStock} ${beforeBurgerBun.unit}`);

    // Perform inventory deduction
    const deductionResult = await InventoryService.deductMainIngredients(testOrderItems);
    
    console.log('\nDeduction result:');
    console.log('Success:', deductionResult.success);
    console.log('Deductions:', deductionResult.deductions);
    console.log('Errors:', deductionResult.errors);

    console.log('\nAfter deduction - Inventory levels:');
    const afterBurgerPatty = await Inventory.findOne({ name: 'Burger Patty' });
    const afterBurgerBun = await Inventory.findOne({ name: 'Burger Bun' });
    console.log(`- Burger Patty: ${afterBurgerPatty.currentStock} ${afterBurgerPatty.unit} (reduced by ${beforeBurgerPatty.currentStock - afterBurgerPatty.currentStock})`);
    console.log(`- Burger Bun: ${afterBurgerBun.currentStock} ${afterBurgerBun.unit} (reduced by ${beforeBurgerBun.currentStock - afterBurgerBun.currentStock})`);

    // Test low stock alerts
    console.log('\n4. Testing low stock alerts...');
    const lowStockResult = await InventoryService.getLowStockAlerts();
    console.log('Low stock items:', lowStockResult.lowStockItems);

    // Test inventory availability check
    console.log('\n5. Testing inventory availability check...');
    const availabilityResult = await InventoryService.checkInventoryAvailability(testOrderItems);
    console.log('Availability check result:');
    console.log('Success:', availabilityResult.success);
    console.log('All available:', availabilityResult.allAvailable);
    console.log('Availability details:', availabilityResult.availability);
    console.log('Warnings:', availabilityResult.warnings);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await MenuItem.deleteOne({ name: 'Test Burger' });
    await Inventory.deleteMany({ supplier: 'Test Supplier' });
    console.log('Test data cleaned up');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testInventoryDeduction();