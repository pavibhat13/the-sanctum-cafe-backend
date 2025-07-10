const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: function() {
      return this.role !== 'customer'; // Email not required for customers
    },
    unique: true,
    sparse: true, // Allow multiple null values
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['customer', 'employee', 'delivery', 'admin'],
    default: 'customer'
  },
  department: {
    type: String,
    enum: ['Kitchen', 'Delivery', 'Management', 'Front of House'],
    required: function() {
      return this.role === 'employee' || this.role === 'delivery';
    }
  },
  phone: {
    type: String,
    required: function() {
      return this.role === 'customer'; // Phone required for customers
    },
    trim: true,
    validate: {
      validator: function(phone) {
        if (!phone) return true; // Allow empty for non-customers
        if (this.role === 'customer') {
          // Strict validation for customers - Indian mobile numbers
          return /^[6-9]\d{9}$/.test(phone);
        } else {
          // More flexible validation for staff - allow international formats
          return /^[\d\s\-\+\(\)\.]+$/.test(phone) && phone.length >= 10;
        }
      },
      message: function(props) {
        if (props.instance && props.instance.role === 'customer') {
          return 'Please enter a valid 10-digit Indian mobile number';
        } else {
          return 'Please enter a valid phone number';
        }
      }
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false }
  },
  // Location tracking for delivery persons
  currentLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    accuracy: Number, // GPS accuracy in meters
    lastUpdated: Date
  },
  // Delivery person specific fields
  deliveryStats: {
    totalDeliveries: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Create compound index for phone uniqueness for customers only
userSchema.index(
  { phone: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      role: 'customer',
      phone: { $exists: true, $ne: null }
    } 
  }
);

module.exports = mongoose.model('User', userSchema);