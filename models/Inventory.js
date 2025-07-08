const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['ingredients', 'beverages', 'dairy', 'produce', 'meat', 'grains', 'spices', 'packaging', 'cleaning', 'other'],
    lowercase: true
  },
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Current stock cannot be negative']
  },
  minStock: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock cannot be negative']
  },
  maxStock: {
    type: Number,
    required: [true, 'Maximum stock level is required'],
    min: [0, 'Maximum stock cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    maxlength: [20, 'Unit cannot exceed 20 characters']
  },
  costPerUnit: {
    type: Number,
    required: [true, 'Cost per unit is required'],
    min: [0, 'Cost per unit cannot be negative']
  },
  supplier: {
    type: String,
    required: [true, 'Supplier is required'],
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  supplierContact: {
    phone: String,
    email: String,
    address: String
  },
  expiryDate: {
    type: Date
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  const percentage = (this.currentStock / this.minStock) * 100;
  if (percentage <= 50) return 'critical';
  if (percentage <= 100) return 'low';
  return 'good';
});

// Virtual for total value
inventorySchema.virtual('totalValue').get(function() {
  return this.currentStock * this.costPerUnit;
});

// Index for better query performance
inventorySchema.index({ category: 1, isActive: 1 });
inventorySchema.index({ currentStock: 1, minStock: 1 });
inventorySchema.index({ name: 'text', supplier: 'text' });

// Ensure virtuals are included in JSON output
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);