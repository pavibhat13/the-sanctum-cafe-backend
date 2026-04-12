const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId (ref User) or String (Manual Employee)
    required: true
  },
  employeeName: { // Helper to store name if employee is a string
    type: String
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['Regular', 'Advance', 'Bonus'],
    default: 'Regular',
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Salary', salarySchema);
