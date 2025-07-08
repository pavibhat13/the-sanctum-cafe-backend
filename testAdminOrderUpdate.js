require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Inventory = require('./models/Inventory');

async function testAdminOrderUpdate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a recent order that's not delivered yet
    const order = await Order.findOne({ 
      status: { $ne: 'delivered' } 
    }).populate('items.menuItem', 'name');

    if (!order) {
      console.log('❌ No non-delivered orders found to test with');
      return;
    }

    console.log(`\n🧪 Testing admin order status update for Order: ${order.orderNumber || order._id}`);
    console.log(`Current status: ${order.status}`);
    console.log(`Items: ${order.items.map(item => `${item.quantity}x ${item.menuItem?.name || 'Unknown'}`).join(', ')}`);

    // Check inventory before
    console.log('\n📦 Inventory BEFORE marking as delivered:');
    const inventoryBefore = {};
    for (const orderItem of order.items) {
      if (orderItem.menuItem) {
        const MenuItem = require('./models/MenuItem');
        const menuItem = await MenuItem.findById(orderItem.menuItem._id);
        if (menuItem && menuItem.mainIngredients) {
          for (const mainIng of menuItem.mainIngredients) {
            const inventoryItem = await Inventory.findOne({ 
              name: { $regex: new RegExp(`^${mainIng.name}$`, 'i') },
              isActive: true 
            });
            if (inventoryItem) {
              inventoryBefore[inventoryItem.name] = inventoryItem.currentStock;
              console.log(`- ${inventoryItem.name}: ${inventoryItem.currentStock} ${inventoryItem.unit}`);
            }
          }
        }
      }
    }

    // Simulate the admin API call by directly calling the updated logic
    console.log('\n🔄 Simulating admin order status update to "delivered"...');
    
    // This simulates what the admin route now does
    const InventoryService = require('./services/inventoryService');
    
    order.status = 'delivered';
    order.actualDeliveryTime = new Date();
    
    console.log(`🚚 [ADMIN] Order ${order.orderNumber || order._id} marked as delivered. Starting inventory deduction...`);
    
    let inventoryDeductionResult = null;
    try {
      inventoryDeductionResult = await InventoryService.deductMainIngredients(order.items);
      
      console.log('📊 [ADMIN] Inventory deduction result:', {
        success: inventoryDeductionResult.success,
        deductions: inventoryDeductionResult.deductions.length,
        errors: inventoryDeductionResult.errors.length
      });
      
      if (inventoryDeductionResult.success && inventoryDeductionResult.deductions.length > 0) {
        console.log('✅ [ADMIN] Inventory successfully deducted:', inventoryDeductionResult.deductions);
      }
      
      if (inventoryDeductionResult.errors.length > 0) {
        console.log('❌ [ADMIN] Inventory deduction errors:', inventoryDeductionResult.errors);
      }
    } catch (inventoryError) {
      console.error('❌ [ADMIN] Failed to deduct inventory:', inventoryError);
    }

    // Check inventory after
    console.log('\n📦 Inventory AFTER marking as delivered:');
    for (const itemName in inventoryBefore) {
      const inventoryItem = await Inventory.findOne({ 
        name: { $regex: new RegExp(`^${itemName}$`, 'i') },
        isActive: true 
      });
      if (inventoryItem) {
        const change = inventoryBefore[itemName] - inventoryItem.currentStock;
        console.log(`- ${inventoryItem.name}: ${inventoryItem.currentStock} ${inventoryItem.unit} (${change > 0 ? '-' + change : 'no change'})`);
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

testAdminOrderUpdate();