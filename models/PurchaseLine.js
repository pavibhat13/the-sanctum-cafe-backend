const mongoose = require('mongoose');

const purchaseLineSchema = new mongoose.Schema({
  purchaseHeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseHeader',
    required: [true, 'Purchase header reference is required']
  },
  item: {
    type: String, // Or ref to Inventory if you want strict link
    required: [true, 'Item name is required'],
    trim: true
  },
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than zero']
  },
  rate: {
    type: Number,
    required: [true, 'Rate/Amount is required'],
    min: [0, 'Rate cannot be negative']
  },
  total: {
    type: Number
  },
  invoiceSupportFile: {
    type: String // Path to uploaded file
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate total before saving
purchaseLineSchema.pre('save', function(next) {
  this.total = this.quantity * this.rate;
  next();
});

// Index for better query performance
purchaseLineSchema.index({ purchaseHeader: 1 });
purchaseLineSchema.index({ item: 1 });

module.exports = mongoose.model('PurchaseLine', purchaseLineSchema);
