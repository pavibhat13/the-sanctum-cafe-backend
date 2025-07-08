const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');

class InventoryService {
  /**
   * Deduct main ingredients from inventory when an order is delivered
   * @param {Array} orderItems - Array of order items with menuItem and quantity
   */
  static async deductMainIngredients(orderItems) {
    const deductionResults = [];
    const errors = [];

    try {
      for (const orderItem of orderItems) {
        const menuItem = await MenuItem.findById(orderItem.menuItem);
        
        if (!menuItem || !menuItem.mainIngredients || menuItem.mainIngredients.length === 0) {
          continue; // Skip if no main ingredients defined
        }

        for (const mainIngredient of menuItem.mainIngredients) {
          const totalQuantityNeeded = mainIngredient.quantity * orderItem.quantity;
          
          try {
            // Find inventory item by name (case-insensitive)
            const inventoryItem = await Inventory.findOne({ 
              name: { $regex: new RegExp(`^${mainIngredient.name}$`, 'i') },
              isActive: true 
            });

            if (!inventoryItem) {
              errors.push({
                menuItem: menuItem.name,
                ingredient: mainIngredient.name,
                error: 'Inventory item not found'
              });
              continue;
            }

            // Check if there's enough stock
            if (inventoryItem.currentStock < totalQuantityNeeded) {
              errors.push({
                menuItem: menuItem.name,
                ingredient: mainIngredient.name,
                error: `Insufficient stock. Available: ${inventoryItem.currentStock} ${inventoryItem.unit}, Required: ${totalQuantityNeeded} ${mainIngredient.unit}`
              });
              continue;
            }

            // Deduct from inventory
            const previousStock = inventoryItem.currentStock;
            inventoryItem.currentStock -= totalQuantityNeeded;
            await inventoryItem.save();

            deductionResults.push({
              menuItem: menuItem.name,
              ingredient: mainIngredient.name,
              quantityDeducted: totalQuantityNeeded,
              unit: mainIngredient.unit,
              previousStock,
              newStock: inventoryItem.currentStock,
              orderQuantity: orderItem.quantity
            });

          } catch (error) {
            errors.push({
              menuItem: menuItem.name,
              ingredient: mainIngredient.name,
              error: error.message
            });
          }
        }
      }

      return {
        success: errors.length === 0,
        deductions: deductionResults,
        errors: errors
      };

    } catch (error) {
      console.error('Error in deductMainIngredients:', error);
      return {
        success: false,
        deductions: [],
        errors: [{ error: 'Failed to process inventory deductions: ' + error.message }]
      };
    }
  }

  /**
   * Check if there's enough inventory for an order before processing
   * @param {Array} orderItems - Array of order items with menuItem and quantity
   */
  static async checkInventoryAvailability(orderItems) {
    const availabilityResults = [];
    const warnings = [];

    try {
      for (const orderItem of orderItems) {
        const menuItem = await MenuItem.findById(orderItem.menuItem);
        
        if (!menuItem || !menuItem.mainIngredients || menuItem.mainIngredients.length === 0) {
          continue;
        }

        for (const mainIngredient of menuItem.mainIngredients) {
          const totalQuantityNeeded = mainIngredient.quantity * orderItem.quantity;
          
          const inventoryItem = await Inventory.findOne({ 
            name: { $regex: new RegExp(`^${mainIngredient.name}$`, 'i') },
            isActive: true 
          });

          if (!inventoryItem) {
            warnings.push({
              menuItem: menuItem.name,
              ingredient: mainIngredient.name,
              warning: 'Inventory item not found'
            });
            continue;
          }

          const isAvailable = inventoryItem.currentStock >= totalQuantityNeeded;
          const stockStatus = inventoryItem.currentStock <= inventoryItem.minStock ? 'low' : 'good';

          availabilityResults.push({
            menuItem: menuItem.name,
            ingredient: mainIngredient.name,
            required: totalQuantityNeeded,
            available: inventoryItem.currentStock,
            unit: mainIngredient.unit,
            isAvailable,
            stockStatus
          });

          if (!isAvailable) {
            warnings.push({
              menuItem: menuItem.name,
              ingredient: mainIngredient.name,
              warning: `Insufficient stock. Available: ${inventoryItem.currentStock}, Required: ${totalQuantityNeeded}`
            });
          }
        }
      }

      return {
        success: true,
        availability: availabilityResults,
        warnings: warnings,
        allAvailable: warnings.length === 0
      };

    } catch (error) {
      console.error('Error in checkInventoryAvailability:', error);
      return {
        success: false,
        availability: [],
        warnings: [{ warning: 'Failed to check inventory availability: ' + error.message }],
        allAvailable: false
      };
    }
  }

  /**
   * Get low stock alerts
   */
  static async getLowStockAlerts() {
    try {
      const lowStockItems = await Inventory.find({
        $expr: { $lte: ['$currentStock', '$minStock'] },
        isActive: true
      }).sort({ currentStock: 1 });

      return {
        success: true,
        lowStockItems: lowStockItems.map(item => ({
          name: item.name,
          currentStock: item.currentStock,
          minStock: item.minStock,
          unit: item.unit,
          stockStatus: item.stockStatus,
          category: item.category
        }))
      };
    } catch (error) {
      console.error('Error in getLowStockAlerts:', error);
      return {
        success: false,
        lowStockItems: [],
        error: error.message
      };
    }
  }
}

module.exports = InventoryService;