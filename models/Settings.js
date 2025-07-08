const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['business', 'delivery', 'payment', 'notifications', 'system']
  },
  key: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound index for category and key uniqueness
settingsSchema.index({ category: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Settings', settingsSchema);