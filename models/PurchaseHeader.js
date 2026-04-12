const mongoose = require('mongoose');

const purchaseHeaderSchema = new mongoose.Schema({
  billNo: {
    type: String,
    required: [true, 'Bill number is required'],
    trim: true,
    unique: true
  },
  vendor: {
    type: String,
    required: [true, 'Vendor is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  invoiceFile: {
    type: String // Path to uploaded file
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Virtual for purchase lines
purchaseHeaderSchema.virtual('lines', {
  ref: 'PurchaseLine',
  localField: '_id',
  foreignField: 'purchaseHeader'
});

// Index for better query performance
purchaseHeaderSchema.index({ billNo: 1 });
purchaseHeaderSchema.index({ vendor: 1 });
purchaseHeaderSchema.index({ date: -1 });

// Ensure virtuals are included in JSON output
purchaseHeaderSchema.set('toJSON', { virtuals: true });
purchaseHeaderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PurchaseHeader', purchaseHeaderSchema);
