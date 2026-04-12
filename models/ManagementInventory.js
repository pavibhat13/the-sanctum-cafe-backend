const mongoose = require('mongoose');

const managementInventorySchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Food Raw Material', 'Vegetables', 'Flour/Other', 'Packaging', 'Other']
  },
  unit: {
    type: String,
    required: true,
    default: 'Pkt'
  },
  openingStock: {
    type: Number,
    default: 0
  },
  purchasedQty: {
    type: Number,
    default: 0
  },
  usedQty: {
    type: Number,
    default: 0
  },
  closingStock: {
    type: Number,
    default: 0
  },
  threshold: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for status
managementInventorySchema.virtual('status').get(function() {
  if (this.closingStock <= this.threshold) {
    return 'Reached threshold';
  }
  return 'Normal';
});

module.exports = mongoose.model('ManagementInventory', managementInventorySchema);
