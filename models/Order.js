const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  specialInstructions: {
    type: String,
    maxlength: [200, 'Special instructions cannot exceed 200 characters']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for walk-in orders
  },
  // For walk-in orders where customer doesn't have an account
  customerInfo: {
    name: {
      type: String,
      required: function() {
        return !this.customer; // Required if no customer account
      }
    },
    phone: String,
    email: String
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'order placed', 'cooking in progress', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderType: {
    type: String,
    enum: ['dine in', 'delivery', 'take away'],
    required: true
  },
  tableNumber: {
    type: Number,
    required: function() {
      return this.orderType === 'dine in';
    }
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    instructions: String
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'digital-wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    required: true,
    min: [0, 'Tax cannot be negative']
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative']
  },
  tip: {
    type: Number,
    default: 0,
    min: [0, 'Tip cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Employee or delivery person
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin who created the order (for walk-in orders)
    required: false
  },
  rating: {
    score: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 300 },
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Generate unique order number before validation
orderSchema.pre('validate', async function(next) {
  if (!this.orderNumber) {
    let orderNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const timestamp = Date.now().toString().slice(-3); // Last 3 digits of timestamp
      orderNumber = `ORD-${dateStr}-${randomNum}-${timestamp}`;
      
      // Check if this order number already exists
      const existingOrder = await this.constructor.findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      // Fallback to timestamp-based unique number
      orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    this.orderNumber = orderNumber;
  }
  next();
});

// Index for better query performance
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, orderType: 1 });
orderSchema.index({ 'customerInfo.phone': 1 }); // For walk-in orders

// Static method to find orders by customer phone
orderSchema.statics.findByCustomerPhone = async function(phone) {
  // First try to find the customer by phone
  const User = mongoose.model('User');
  const customer = await User.findOne({ phone, role: 'customer' });
  
  let orders = [];
  
  // If customer exists, find orders by customer ID
  if (customer) {
    orders = await this.find({ customer: customer._id })
      .populate('customer', 'name phone email')
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
  }
  
  // Also find walk-in orders with this phone number
  const walkInOrders = await this.find({ 'customerInfo.phone': phone })
    .populate('items.menuItem')
    .sort({ createdAt: -1 });
  
  // Combine and sort all orders
  const allOrders = [...orders, ...walkInOrders];
  allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return allOrders;
};

module.exports = mongoose.model('Order', orderSchema);