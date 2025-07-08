
require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Inventory = require('./models/Inventory');

async function checkBurgerData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find burger menu items
    console.log('\n=== BURGER MENU ITEMS ===');
    const burgers = await MenuItem.find({ name: { $regex: /burger/i } });
    
    if (burgers.length === 0) {
      console.log('No burger menu items found');
    } else {
      burgers.forEach((burger, index) => {
        console.log(`\n${index + 1}. ${burger.name}`);
        console.log('   Main Ingredients:');
        if (burger.mainIngredients && burger.mainIngredients.length > 0) {
          burger.mainIngredients.forEach(ing => {
            console.log(`   - ${ing.name}: ${ing.quantity} ${ing.unit}`);
          });
        } else {
          console.log('   - No main ingredients defined');
        }
        console.log('   Regular Ingredients:', burger.ingredients);
      });
    }

    // Find inventory items related to burger
    console.log('\n=== BURGER-RELATED INVENTORY ===');
    const burgerInventory = await Inventory.find({ 
      name: { $regex: /(burger|patty|bun)/i },
      isActive: true 
    });
    
    if (burgerInventory.length === 0) {
      console.log('No burger-related inventory items found');
    } else {
      burgerInventory.forEach((item, index) => {
        console.log(`${index + 1}. "${item.name}": ${item.currentStock} ${item.unit} (Category: ${item.category})`);
      });
    }

    // Check for exact matches
    console.log('\n=== MATCHING CHECK ===');
    if (burgers.length > 0) {
      const burger = burgers[0]; // Check first burger
      console.log(`Checking matches for: ${burger.name}`);
      
      if (burger.mainIngredients && burger.mainIngredients.length > 0) {
        for (const mainIng of burger.mainIngredients) {
          console.log(`\nLooking for: "${mainIng.name}"`);
          
          // Exact match
          const exact = await Inventory.findOne({ name: mainIng.name, isActive: true });
          if (exact) {
            console.log(`✅ Exact match found: "${exact.name}"`);
          } else {
            console.log(`❌ No exact match for "${mainIng.name}"`);
            
            // Case insensitive
            const caseInsensitive = await Inventory.findOne({ 
              name: { $regex: new RegExp(`^${mainIng.name}$`, 'i') },
              isActive: true 
            });
            
            if (caseInsensitive) {
              console.log(`✅ Case-insensitive match: "${caseInsensitive.name}"`);
            } else {
              console.log(`❌ No case-insensitive match either`);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkBurgerData();