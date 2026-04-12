const mongoose = require('mongoose');

const checklistLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Cleaning', 'Hygiene'],
    required: true
  },
  items: [{
    name: String,
    checked: Boolean
  }],
  remarks: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChecklistLog', checklistLogSchema);
