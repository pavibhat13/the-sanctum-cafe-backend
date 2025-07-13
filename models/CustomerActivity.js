const mongoose = require('mongoose');

const customerActivitySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  activityType: {
    type: String,
    enum: ['login', 'logout', 'cart_add', 'cart_remove', 'cart_update', 'cart_clear', 'order_placed', 'page_view'],
    required: true
  },
  details: {
    // For cart activities
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    quantity: Number,
    previousQuantity: Number,
    price: Number,
    
    // For login/logout
    loginMethod: String, // 'email', 'google', etc.
    ipAddress: String,
    userAgent: String,
    
    // For orders
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    
    // For page views
    page: String,
    referrer: String,
    
    // General metadata
    cartTotal: Number,
    cartItemCount: Number,
    metadata: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
customerActivitySchema.index({ customer: 1, timestamp: -1 });
customerActivitySchema.index({ sessionId: 1, timestamp: -1 });
customerActivitySchema.index({ activityType: 1, timestamp: -1 });
customerActivitySchema.index({ timestamp: -1 });

// Virtual for activity duration (for sessions)
customerActivitySchema.virtual('duration').get(function() {
  if (this.activityType === 'logout' && this.details?.loginTime) {
    return this.timestamp - new Date(this.details.loginTime);
  }
  return null;
});

module.exports = mongoose.model('CustomerActivity', customerActivitySchema);