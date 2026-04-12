const mongoose = require('mongoose');

const dailySalesSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required'],
    unique: true
  },
  cash: {
    type: Number,
    default: 0,
    min: [0, 'Cash cannot be negative']
  },
  upi: {
    type: Number,
    default: 0,
    min: [0, 'UPI cannot be negative']
  },
  swiggy: {
    type: Number,
    default: 0,
    min: [0, 'Swiggy cannot be negative']
  },
  zomato: {
    type: Number,
    default: 0,
    min: [0, 'Zomato cannot be negative']
  },
  total: {
    type: Number
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

// Calculate total before saving
dailySalesSchema.pre('save', function(next) {
  this.total = this.cash + this.upi + this.swiggy + this.zomato;
  next();
});

// Index for better query performance
dailySalesSchema.index({ date: -1 });

module.exports = mongoose.model('DailySales', dailySalesSchema);
