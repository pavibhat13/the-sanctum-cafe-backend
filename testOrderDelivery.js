require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const MenuItem = require('./models/MenuItem');
const Inventory = require('./models/Inventory');
const InventoryService = require('./services/inventoryService');

async function testOrderDelivery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the most recent order
    console.log('\n📋 Looking for recent orders...');
    const recentOrders = await Order.find()
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentOrders.length === 0) {
      console.log('❌ No orders found');
      return;
    }

    console.log('Recent orders:');
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.orderNumber || order._id} - Status: ${order.status}`);
      console.log(`   Items: ${order.items.map(item => `${item.quantity}x ${item.menuItem?.name || 'Unknown'}`).join(', ')}`);
    });

    // Use the first order for testing
    const testOrder = recentOrders[0];
    console.log(`\n🧪 Testing delivery process for Order: ${testOrder.orderNumber || testOrder._id}`);

    // Check inventory before
    console.log('\n📦 Inventory BEFORE marking as delivered:');
    for (const orderItem of testOrder.items) {
      if (orderItem.menuItem) {
        const menuItem = await MenuItem.findById(orderItem.menuItem._id);
        if (menuItem && menuItem.mainIngredients) {
          for (const mainIng of menuItem.mainIngredients) {
            const inventoryItem = await Inventory.findOne({ 
              name: { $regex: new RegExp(`^${mainIng.name}$`, 'i') },
              isActive: true 
            });
            if (inventoryItem) {
              console.log(`- ${inventoryItem.name}: ${inventoryItem.currentStock} ${inventoryItem.unit}`);
            }
          }
        }
      }
    }

    // Simulate the exact same process as the order route
    console.log('\n🚚 Simulating order delivery process...');
    
    // This is exactly what happens in the order route
    testOrder.status = 'delivered';
    testOrder.actualDeliveryTime = new Date();
    
    console.log(`Order ${testOrder.orderNumber || testOrder._id} marked as delivered. Starting inventory deduction...`);
    console.log('Order items structure:', JSON.stringify(testOrder.items, null, 2));
    
    let inventoryDeductionResult = null;
    
    try {
      inventoryDeductionResult = await InventoryService.deductMainIngredients(testOrder.items);
      
      console.log('📊 Inventory deduction result:', {
        success: inventoryDeductionResult.success,
        deductions: inventoryDeductionResult.deductions.length,
        errors: inventoryDeductionResult.errors.length
      });
      
      if (!inventoryDeductionResult.success && inventoryDeductionResult.errors.length > 0) {
        console.warn('⚠️  Inventory deduction warnings:', inventoryDeductionResult.errors);
      }
      
      if (inventoryDeductionResult.success && inventoryDeductionResult.deductions.length > 0) {
        console.log('✅ Inventory successfully deducted:', inventoryDeductionResult.deductions);
      }
    } catch (inventoryError) {
      console.error('❌ Failed to deduct inventory:', inventoryError);
    }

    // Check inventory after
    console.log('\n📦 Inventory AFTER marking as delivered:');
    for (const orderItem of testOrder.items) {
      if (orderItem.menuItem) {
        const menuItem = await MenuItem.findById(orderItem.menuItem._id);
        if (menuItem && menuItem.mainIngredients) {
          for (const mainIng of menuItem.mainIngredients) {
            const inventoryItem = await Inventory.findOne({ 
              name: { $regex: new RegExp(`^${mainIng.name}$`, 'i') },
              isActive: true 
            });
            if (inventoryItem) {
              console.log(`- ${inventoryItem.name}: ${inventoryItem.currentStock} ${inventoryItem.unit}`);
            }
          }
        }
      }
    }

    // Don't save the order changes - this is just a test
    console.log('\n⚠️  Note: Order status was NOT actually saved (this is just a test)');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testOrderDelivery();