const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

async function addMainIngredientsToMenuItems() {
  try {
    console.log('Starting migration: Adding mainIngredients field to existing menu items...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    }

    // Find all menu items that don't have mainIngredients field
    const menuItems = await MenuItem.find({ 
      $or: [
        { mainIngredients: { $exists: false } },
        { mainIngredients: { $size: 0 } }
      ]
    });

    console.log(`Found ${menuItems.length} menu items to update`);

    let updatedCount = 0;

    for (const item of menuItems) {
      // Initialize empty mainIngredients array if it doesn't exist
      if (!item.mainIngredients || item.mainIngredients.length === 0) {
        item.mainIngredients = [];
        
        // You can add some default main ingredients based on category or name
        // This is just an example - you should customize this based on your actual menu
        if (item.category === 'main-course') {
          // Example: Add some common main ingredients for main courses
          if (item.name.toLowerCase().includes('burger')) {
            item.mainIngredients = [
              { name: 'Burger Patty', quantity: 1, unit: 'piece' },
              { name: 'Burger Bun', quantity: 1, unit: 'piece' }
            ];
          } else if (item.name.toLowerCase().includes('pasta')) {
            item.mainIngredients = [
              { name: 'Pasta', quantity: 100, unit: 'grams' }
            ];
          } else if (item.name.toLowerCase().includes('pizza')) {
            item.mainIngredients = [
              { name: 'Pizza Dough', quantity: 1, unit: 'piece' },
              { name: 'Pizza Sauce', quantity: 50, unit: 'ml' }
            ];
          }
        } else if (item.category === 'beverage') {
          if (item.name.toLowerCase().includes('coffee') || item.name.toLowerCase().includes('espresso')) {
            item.mainIngredients = [
              { name: 'Coffee Beans', quantity: 20, unit: 'grams' }
            ];
          } else if (item.name.toLowerCase().includes('tea')) {
            item.mainIngredients = [
              { name: 'Tea Leaves', quantity: 5, unit: 'grams' }
            ];
          }
        }
        
        await item.save();
        updatedCount++;
        console.log(`Updated ${item.name} with ${item.mainIngredients.length} main ingredients`);
      }
    }

    console.log(`Migration completed successfully! Updated ${updatedCount} menu items.`);
    console.log('Note: Please review and customize the main ingredients for each menu item in the admin panel.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  addMainIngredientsToMenuItems()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addMainIngredientsToMenuItems;