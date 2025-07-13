const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Inventory = require('../models/Inventory');
const CustomerActivity = require('../models/CustomerActivity');
const InventoryService = require('../services/inventoryService');
const CustomerActivityService = require('../services/customerActivityService');
const { authenticateToken, requireAdmin, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 30);

    const [
      totalUsers,
      totalOrders,
      todayOrders,
      weeklyOrders,
      monthlyOrders,
      totalRevenue,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      pendingOrders,
      onlineOrders,
      inCafeOrders,
      popularItems,
      recentOrders
    ] = await Promise.all([
      // Total users
      User.countDocuments({ isActive: true }),
      
      // Total orders
      Order.countDocuments(),
      
      // Today's orders
      Order.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Weekly orders
      Order.countDocuments({
        createdAt: { $gte: weekStart }
      }),

      // Monthly orders
      Order.countDocuments({
        createdAt: { $gte: monthStart }
      }),
      
      // Total revenue
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Today's revenue
      Order.aggregate([
        { 
          $match: { 
            status: 'delivered',
            createdAt: { $gte: today, $lt: tomorrow }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),

      // Weekly revenue
      Order.aggregate([
        { 
          $match: { 
            status: 'delivered',
            createdAt: { $gte: weekStart }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),

      // Monthly revenue
      Order.aggregate([
        { 
          $match: { 
            status: 'delivered',
            createdAt: { $gte: monthStart }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Pending orders
      Order.countDocuments({ 
        status: { $in: ['pending', 'confirmed', 'preparing'] } 
      }),

      // Today's online orders
      Order.countDocuments({
        orderType: 'delivery',
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Today's in-cafe orders
      Order.countDocuments({
        orderType: 'dine in',
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      
      // Popular menu items
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $unwind: '$items' },
        { 
          $group: { 
            _id: '$items.menuItem', 
            orders: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          } 
        },
        { $sort: { orders: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'menuitems',
            localField: '_id',
            foreignField: '_id',
            as: 'menuItem'
          }
        },
        { $unwind: '$menuItem' },
        {
          $project: {
            name: '$menuItem.name',
            orders: 1,
            revenue: 1
          }
        }
      ]),

      // Recent orders
      Order.find()
        .populate('customer', 'name email')
        .populate('items.menuItem', 'name price')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // Calculate average order values
    const todayAvgOrderValue = todayOrders > 0 ? (todayRevenue[0]?.total || 0) / todayOrders : 0;
    const weeklyAvgOrderValue = weeklyOrders > 0 ? (weeklyRevenue[0]?.total || 0) / weeklyOrders : 0;
    const monthlyAvgOrderValue = monthlyOrders > 0 ? (monthlyRevenue[0]?.total || 0) / monthlyOrders : 0;

    // Format recent orders for frontend
    const formattedRecentOrders = recentOrders.map(order => ({
      id: order._id,
      customerName: order.customer?.name || 'Guest',
      items: order.items.map(item => item.menuItem?.name || 'Unknown Item'),
      total: order.total,
      status: order.status,
      timestamp: order.createdAt
    }));

    // Mock low stock items (since we don't have inventory management yet)
    const lowStockItems = [
      {
        name: 'Coffee Beans',
        currentStock: 5,
        minStock: 20,
        unit: 'kg'
      },
      {
        name: 'Milk',
        currentStock: 8,
        minStock: 15,
        unit: 'L'
      }
    ];

    res.json({
      todayStats: {
        totalOrders: todayOrders,
        totalRevenue: todayRevenue[0]?.total || 0,
        averageOrderValue: todayAvgOrderValue,
        onlineOrders: onlineOrders,
        inCafeOrders: inCafeOrders,
        pendingOrders: pendingOrders
      },
      weeklyStats: {
        totalOrders: weeklyOrders,
        totalRevenue: weeklyRevenue[0]?.total || 0,
        averageOrderValue: weeklyAvgOrderValue
      },
      monthlyStats: {
        totalOrders: monthlyOrders,
        totalRevenue: monthlyRevenue[0]?.total || 0,
        averageOrderValue: monthlyAvgOrderValue
      },
      recentOrders: formattedRecentOrders,
      popularItems: popularItems,
      lowStockItems: lowStockItems
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent orders
router.get('/recent-orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ orders });
  } catch (error) {
    console.error('Recent orders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch recent orders' });
  }
});

// Get sales analytics
router.get('/analytics/sales', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ salesData });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch sales analytics' });
  }
});

// Get order status distribution
router.get('/analytics/order-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ statusDistribution });
  } catch (error) {
    console.error('Order status analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch order status analytics' });
  }
});

// Get delivery statistics
router.get('/delivery/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      deliveryOrders,
      pendingDeliveries,
      outForDelivery,
      deliveredToday,
      totalDeliveryPersons,
      activeDeliveryPersons
    ] = await Promise.all([
      // Today's delivery orders
      Order.countDocuments({
        orderType: 'delivery',
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Pending delivery assignments
      Order.countDocuments({
        orderType: 'delivery',
        status: { $in: ['confirmed', 'preparing', 'ready for pickup'] },
        assignedTo: { $exists: false },
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Out for delivery
      Order.countDocuments({
        orderType: 'delivery',
        status: 'out for delivery',
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Delivered today
      Order.countDocuments({
        orderType: 'delivery',
        status: 'delivered',
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // Total delivery persons
      User.countDocuments({
        role: 'delivery'
      }),

      // Active delivery persons
      User.countDocuments({
        role: 'delivery',
        isActive: true
      })
    ]);

    res.json({
      deliveryOrders,
      pendingDeliveries,
      outForDelivery,
      deliveredToday,
      totalDeliveryPersons,
      activeDeliveryPersons
    });
  } catch (error) {
    console.error('Delivery stats error:', error);
    res.status(500).json({ message: 'Failed to fetch delivery statistics' });
  }
});

// Get delivery orders
router.get('/delivery/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, assignedTo, page = 1, limit = 50 } = req.query;
    const filter = { orderType: 'delivery' };
    
    if (status) filter.status = status;
    if (assignedTo && assignedTo !== 'all') filter.assignedTo = assignedTo;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('items.menuItem', 'name price')
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Delivery orders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch delivery orders' });
  }
});

// Assign delivery person to order
router.patch('/orders/:orderId/assign-delivery', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryPersonId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.orderType !== 'delivery') {
      return res.status(400).json({ message: 'Order is not a delivery order' });
    }

    // Verify delivery person exists and is active
    const deliveryPerson = await User.findOne({
      _id: deliveryPersonId,
      role: 'delivery',
      isActive: true
    });

    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found or inactive' });
    }

    // Update order
    order.assignedTo = deliveryPersonId;
    if (order.status === 'confirmed' || order.status === 'preparing') {
      order.status = 'ready for pickup';
    }
    order.updatedAt = new Date();

    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      notes: `Assigned to delivery person: ${deliveryPerson.name}`
    });

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('items.menuItem', 'name price');
    await order.populate('assignedTo', 'name phone');

    res.json({
      message: 'Delivery person assigned successfully',
      order
    });
  } catch (error) {
    console.error('Assign delivery person error:', error);
    res.status(500).json({ message: 'Failed to assign delivery person' });
  }
});

// Get all users (for admin user management)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, phone, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, phone, address },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('User update error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Toggle user status
router.patch('/users/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('User status toggle error:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
});

// Get all orders (for admin order management)
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, orderType, page = 1, limit = 20, all = false } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;

    let orders, total;
    
    if (all === 'true') {
      // Fetch all orders without pagination
      [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('customer', 'name email phone')
          .populate('items.menuItem', 'name price')
          .populate('assignedTo', 'name role')
          .sort({ createdAt: -1 }),
        Order.countDocuments(filter)
      ]);
    } else {
      // Use pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('customer', 'name email phone')
          .populate('items.menuItem', 'name price')
          .populate('assignedTo', 'name role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Order.countDocuments(filter)
      ]);
    }

    const response = {
      orders,
      pagination: {
        page: parseInt(page),
        limit: all === 'true' ? total : parseInt(limit),
        total,
        pages: all === 'true' ? 1 : Math.ceil(total / parseInt(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Update order status
router.patch('/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'order placed', 'cooking in progress', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // First get the order to check current status and items
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update the order status
    order.status = status;
    order.updatedAt = new Date();
    
    let inventoryDeductionResult = null;
    
    // Handle inventory deduction when order is marked as delivered
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
      
      console.log(`🚚 [ADMIN] Order ${order.orderNumber || order._id} marked as delivered. Starting inventory deduction...`);
      console.log('Order items:', JSON.stringify(order.items, null, 2));
      
      // Automatically deduct main ingredients from inventory
      try {
        inventoryDeductionResult = await InventoryService.deductMainIngredients(order.items);
        
        console.log('📊 [ADMIN] Inventory deduction result:', {
          success: inventoryDeductionResult.success,
          deductions: inventoryDeductionResult.deductions.length,
          errors: inventoryDeductionResult.errors.length
        });
        
        if (!inventoryDeductionResult.success && inventoryDeductionResult.errors.length > 0) {
          console.warn('⚠️  [ADMIN] Inventory deduction warnings for order', order.orderNumber, ':', inventoryDeductionResult.errors);
        }
        
        if (inventoryDeductionResult.success && inventoryDeductionResult.deductions.length > 0) {
          console.log('✅ [ADMIN] Inventory successfully deducted:', inventoryDeductionResult.deductions);
        }
      } catch (inventoryError) {
        console.error('❌ [ADMIN] Failed to deduct inventory for order', order.orderNumber, ':', inventoryError);
        // Don't fail the order status update if inventory deduction fails
        // Just log the error and continue
      }
    }

    // Save the order
    await order.save();
    
    // Populate the order for response
    await order.populate('customer', 'name email');
    await order.populate('items.menuItem', 'name price');

    const response = {
      message: 'Order status updated successfully',
      order
    };

    // Include inventory deduction results if available
    if (inventoryDeductionResult) {
      response.inventoryDeduction = {
        success: inventoryDeductionResult.success,
        deductions: inventoryDeductionResult.deductions,
        errors: inventoryDeductionResult.errors
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// Create order on behalf of customer (for walk-in orders) - Employee access
router.post('/orders', authenticateToken, requireEmployee, [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.menuItem').isMongoId().withMessage('Invalid menu item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.specialInstructions').optional().isLength({ max: 200 }).withMessage('Special instructions too long'),
  body('orderType').isIn(['dine in', 'take away']).withMessage('Invalid order type for admin orders'),
  body('tableNumber').custom((value, { req }) => {
    // If order type is dine in, table number is required and must be a positive integer
    if (req.body.orderType === 'dine in') {
      if (!value || isNaN(parseInt(value)) || parseInt(value) < 1) {
        throw new Error('Table number is required and must be a positive integer for dine in orders');
      }
    }
    // For other order types, table number should be null or undefined
    return true;
  }).withMessage('Invalid table number'),
  body('paymentMethod').isIn(['cash', 'card', 'digital-wallet']).withMessage('Invalid payment method'),
  body('customerInfo.name').notEmpty().withMessage('Customer name is required'),
  body('customerInfo.phone').optional().custom((value) => {
    // Allow empty or undefined values
    if (!value || value.trim() === '') {
      return true;
    }
    // Allow various phone number formats for non-empty values
    const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^[\+]?[0-9]{7,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Invalid phone number format');
    }
    return true;
  }).withMessage('Invalid phone number format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { items, orderType, tableNumber, paymentMethod, customerInfo, specialInstructions } = req.body;
    console.log('Admin order creation - parsed data:', {
      items,
      orderType,
      tableNumber,
      paymentMethod,
      customerInfo,
      specialInstructions
    });

    // Validate menu items and calculate prices
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ 
      _id: { $in: menuItemIds }, 
      isAvailable: true 
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ message: 'Some menu items are not available' });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = items.map(orderItem => {
      const menuItem = menuItems.find(mi => mi._id.toString() === orderItem.menuItem);
      const itemTotal = menuItem.price * orderItem.quantity;
      subtotal += itemTotal;

      return {
        menuItem: orderItem.menuItem,
        quantity: orderItem.quantity,
        price: menuItem.price,
        specialInstructions: orderItem.specialInstructions
      };
    });

    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal;

    // Create a temporary customer object for walk-in orders
    // We'll store customer info in the order but not create a user account
    const orderData = {
      customer: null, // No customer account for walk-in orders
      customerInfo: {
        name: customerInfo.name,
        phone: customerInfo.phone || '',
        email: customerInfo.email || ''
      },
      items: orderItems,
      status: 'order placed', // Walk-in orders created by staff are automatically accepted
      orderType,
      tableNumber: orderType === 'dine in' ? tableNumber : undefined,
      paymentMethod,
      subtotal,
      tax,
      deliveryFee: 0,
      total,
      specialInstructions: specialInstructions || '',
      createdBy: req.user._id, // Track which admin created the order
      estimatedDeliveryTime: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes for in-cafe orders
    };

    console.log('Creating order with data:', orderData);
    const order = new Order(orderData);
    console.log('Order before save:', order.toObject());
    
    await order.save();
    console.log('Order after save:', order.toObject());
    await order.populate('items.menuItem', 'name price image');

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Admin order creation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle specific MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    // Handle MongoDB cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format', 
        error: `Invalid ${error.path}: ${error.value}` 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Customer analytics
router.get('/analytics/customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const [
      totalCustomers,
      newCustomers,
      topCustomers,
      customerOrderStats,
      customerGrowthData,
      orderFrequencyData
    ] = await Promise.all([
      // Total active customers
      User.countDocuments({ role: 'customer', isActive: true }),
      
      // New customers in period
      User.countDocuments({ 
        role: 'customer', 
        isActive: true,
        createdAt: { $gte: startDate }
      }),
      
      // Top customers by order count and total spent
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { 
          $group: { 
            _id: '$customer', 
            orders: { $sum: 1 },
            totalSpent: { $sum: '$total' },
            lastOrderDate: { $max: '$createdAt' }
          } 
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $project: {
            name: '$customer.name',
            email: '$customer.email',
            orders: 1,
            totalSpent: 1,
            lastOrderDate: 1
          }
        }
      ]),
      
      // Customer order frequency stats
      Order.aggregate([
        { $match: { status: 'delivered' } },
        {
          $group: {
            _id: '$customer',
            orderCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            avgOrdersPerCustomer: { $avg: '$orderCount' }
          }
        }
      ]),
      
      // Customer growth over time (weekly data for the period)
      User.aggregate([
        { 
          $match: { 
            role: 'customer', 
            isActive: true,
            createdAt: { $gte: startDate }
          } 
        },
        {
          $group: {
            _id: {
              week: { $week: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]),
      
      // Order frequency analysis
      Order.aggregate([
        { 
          $match: { 
            status: 'delivered',
            createdAt: { $gte: startDate }
          } 
        },
        {
          $group: {
            _id: {
              day: { $dayOfYear: '$createdAt' },
              week: { $week: '$createdAt' },
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            dailyOrders: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: '$dailyOrders' },
            totalDays: { $sum: 1 },
            avgDaily: { $avg: '$dailyOrders' }
          }
        }
      ])
    ]);

    const returningCustomers = totalCustomers - newCustomers;
    const customerRetentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // Process customer growth data for chart
    const growthLabels = [];
    const growthData = [];
    
    if (customerGrowthData.length > 0) {
      customerGrowthData.forEach(item => {
        growthLabels.push(`Week ${item._id.week}`);
        growthData.push(item.count);
      });
    } else {
      // Provide default data if no growth data
      const weeksInPeriod = Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000));
      for (let i = 0; i < Math.min(weeksInPeriod, 8); i++) {
        growthLabels.push(`Week ${i + 1}`);
        growthData.push(0);
      }
    }

    // Calculate order frequency
    const orderFreq = orderFrequencyData[0] || {};
    const daysInPeriod = Math.ceil((new Date() - startDate) / (24 * 60 * 60 * 1000));
    const avgDaily = orderFreq.avgDaily || 0;
    const avgWeekly = avgDaily * 7;
    const avgMonthly = avgDaily * 30;

    res.json({
      totalCustomers,
      newCustomers,
      returningCustomers,
      customerRetentionRate: Math.round(customerRetentionRate * 100) / 100,
      averageOrdersPerCustomer: customerOrderStats[0]?.avgOrdersPerCustomer || 0,
      topCustomers: topCustomers || [],
      customerGrowth: {
        labels: growthLabels,
        data: growthData
      },
      orderFrequency: {
        daily: Math.round(avgDaily * 10) / 10,
        weekly: Math.round(avgWeekly * 10) / 10,
        monthly: Math.round(avgMonthly * 10) / 10
      }
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch customer analytics' });
  }
});

// Get real-time customer activity analytics
router.get('/analytics/customer-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateRange = '30d', fromDate, toDate } = req.query;
    const analyticsData = await CustomerActivityService.getCustomerAnalytics(dateRange, null, fromDate, toDate);
    res.json(analyticsData);
  } catch (error) {
    console.error('Customer activity analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch customer activity analytics' });
  }
});

// Get real-time active sessions
router.get('/analytics/active-sessions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const activeSessions = await CustomerActivityService.getActiveSessions();
    res.json({ activeSessions });
  } catch (error) {
    console.error('Active sessions error:', error);
    res.status(500).json({ message: 'Failed to fetch active sessions' });
  }
});

// Get detailed customer activity for specific customer
router.get('/analytics/customer-activity/:customerId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { dateRange = '7d', fromDate, toDate } = req.query;
    
    const analyticsData = await CustomerActivityService.getCustomerAnalytics(dateRange, customerId, fromDate, toDate);
    res.json(analyticsData);
  } catch (error) {
    console.error('Customer activity error:', error);
    res.status(500).json({ message: 'Failed to fetch customer activity' });
  }
});

// ===== INVENTORY MANAGEMENT ROUTES =====

// Get all inventory items
router.get('/inventory', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, stockStatus, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let items = await Inventory.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by stock status if specified
    if (stockStatus && stockStatus !== 'all') {
      items = items.filter(item => {
        const percentage = (item.currentStock / item.minStock) * 100;
        switch (stockStatus) {
          case 'critical':
            return percentage <= 50;
          case 'low':
            return percentage > 50 && percentage <= 100;
          case 'good':
            return percentage > 100;
          default:
            return true;
        }
      });
    }

    const total = await Inventory.countDocuments(filter);

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory items' });
  }
});

// Add new inventory item
router.post('/inventory', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      currentStock,
      minStock,
      maxStock,
      unit,
      costPerUnit,
      supplier,
      supplierContact,
      expiryDate,
      notes
    } = req.body;

    const inventoryItem = new Inventory({
      name,
      category,
      currentStock,
      minStock,
      maxStock,
      unit,
      costPerUnit,
      supplier,
      supplierContact,
      expiryDate,
      notes
    });

    await inventoryItem.save();

    res.status(201).json({
      message: 'Inventory item added successfully',
      item: inventoryItem
    });
  } catch (error) {
    console.error('Add inventory item error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to add inventory item' });
  }
});

// Update inventory item
router.put('/inventory/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      currentStock,
      minStock,
      maxStock,
      unit,
      costPerUnit,
      supplier,
      supplierContact,
      expiryDate,
      notes
    } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (currentStock !== undefined) updateData.currentStock = currentStock;
    if (minStock !== undefined) updateData.minStock = minStock;
    if (maxStock !== undefined) updateData.maxStock = maxStock;
    if (unit !== undefined) updateData.unit = unit;
    if (costPerUnit !== undefined) updateData.costPerUnit = costPerUnit;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (supplierContact !== undefined) updateData.supplierContact = supplierContact;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate;
    if (notes !== undefined) updateData.notes = notes;
    if (currentStock !== undefined && currentStock > 0) updateData.lastRestocked = new Date();

    // Additional validation for minStock and maxStock relationship
    if (minStock !== undefined || maxStock !== undefined) {
      const existingItem = await Inventory.findById(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      
      const finalMinStock = minStock !== undefined ? minStock : existingItem.minStock;
      const finalMaxStock = maxStock !== undefined ? maxStock : existingItem.maxStock;
      
      if (finalMaxStock < finalMinStock) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: ['Maximum stock must be greater than or equal to minimum stock']
        });
      }
    }

    const inventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json({
      message: 'Inventory item updated successfully',
      item: inventoryItem
    });
  } catch (error) {
    console.error('Update inventory item error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/inventory/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const inventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json({
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ message: 'Failed to delete inventory item' });
  }
});

// ===== MENU MANAGEMENT ROUTES =====

// Get all menu items for admin
router.get('/menu', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, isAvailable, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MenuItem.countDocuments(filter)
    ]);

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Menu items fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch menu items' });
  }
});

// Add new menu item
router.post('/menu', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const menuItem = new MenuItem(req.body);
    await menuItem.save();

    res.status(201).json({
      message: 'Menu item added successfully',
      item: menuItem
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to add menu item' });
  }
});

// Update menu item
router.put('/menu/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Update menu item request body:', req.body);
    console.log('Preparation time received:', req.body.preparationTime);
    
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    console.log('Updated menu item:', menuItem);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({
      message: 'Menu item updated successfully',
      item: menuItem
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/menu/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: 'Failed to delete menu item' });
  }
});

// Toggle menu item availability
router.patch('/menu/:id/availability', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    res.json({
      message: `Menu item ${menuItem.isAvailable ? 'enabled' : 'disabled'} successfully`,
      item: menuItem
    });
  } catch (error) {
    console.error('Toggle menu item availability error:', error);
    res.status(500).json({ message: 'Failed to toggle menu item availability' });
  }
});

// Get available categories
router.get('/menu/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get categories from the MenuItem model enum
    const MenuItem = require('../models/MenuItem');
    const categoryEnum = MenuItem.schema.paths.category.enumValues;
    
    // Also get categories that are actually in use
    const categoriesInUse = await MenuItem.distinct('category');
    
    // Combine and deduplicate
    const allCategories = [...new Set([...categoryEnum, ...categoriesInUse])];
    
    // Create category objects with display names
    const categories = allCategories.map(category => ({
      value: category,
      label: category.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));
    
    res.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// ===== EMPLOYEE MANAGEMENT ROUTES =====

// Get all employees
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    // Only get employees and delivery personnel, not customers or admins
    filter.role = { $in: ['employee', 'delivery'] };
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Employees fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// Add new employee
router.post('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      address,
      isActive = true
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Validate role
    if (!['employee', 'delivery'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be employee or delivery' });
    }

    const employee = new User({
      name,
      email,
      password,
      role,
      department,
      phone,
      address,
      isActive
    });

    await employee.save();

    // Remove password from response
    const employeeResponse = employee.toJSON();

    res.status(201).json({
      message: 'Employee added successfully',
      employee: employeeResponse
    });
  } catch (error) {
    console.error('Add employee error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to add employee' });
  }
});

// Update employee
router.put('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      address,
      isActive
    } = req.body;

    // Validate role if provided
    if (role && !['employee', 'delivery'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be employee or delivery' });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already taken by another user' });
      }
    }

    // Prepare update data
    const updateData = {
      name,
      email,
      role,
      department,
      phone,
      address,
      isActive
    };

    // Only include password if it's provided and not empty
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const employee = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      message: 'Employee updated successfully',
      employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// Delete employee (soft delete by setting isActive to false)
router.delete('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      message: 'Employee deactivated successfully',
      employee
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Failed to deactivate employee' });
  }
});

// ===== CASH COLLECTION TRACKING =====

// Get cash collection report for delivery persons
router.get('/cash-collection', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fromDate, toDate, deliveryPersonId } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        message: 'From date and to date are required' 
      });
    }

    // Parse dates and set time boundaries
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    // Build filter for orders
    const orderFilter = {
      orderType: 'delivery',
      paymentMethod: 'cash',
      status: 'delivered',
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // If specific delivery person is selected, filter by assignedTo
    if (deliveryPersonId && deliveryPersonId !== 'all') {
      orderFilter.assignedTo = deliveryPersonId;
    }

    // Get orders with cash on delivery
    const orders = await Order.find(orderFilter)
      .populate('assignedTo', 'name email phone')
      .populate('customer', 'name phone')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    // Group orders by delivery person
    const collectionData = {};
    let totalCashToCollect = 0;

    orders.forEach(order => {
      const deliveryPerson = order.assignedTo;
      if (!deliveryPerson) return;

      const personId = deliveryPerson._id.toString();
      
      if (!collectionData[personId]) {
        collectionData[personId] = {
          deliveryPerson: {
            id: deliveryPerson._id,
            name: deliveryPerson.name,
            email: deliveryPerson.email,
            phone: deliveryPerson.phone
          },
          orders: [],
          totalAmount: 0,
          orderCount: 0
        };
      }

      collectionData[personId].orders.push({
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || order.customerInfo?.name || 'Guest',
        customerPhone: order.customer?.phone || order.customerInfo?.phone || '',
        total: order.total,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          name: item.menuItem?.name || 'Unknown Item',
          quantity: item.quantity,
          price: item.price
        }))
      });

      collectionData[personId].totalAmount += order.total;
      collectionData[personId].orderCount += 1;
      totalCashToCollect += order.total;
    });

    // Convert to array format
    const collectionReport = Object.values(collectionData);

    res.json({
      success: true,
      data: {
        dateRange: { fromDate, toDate },
        totalCashToCollect,
        totalOrders: orders.length,
        deliveryPersonsCount: collectionReport.length,
        collections: collectionReport
      }
    });

  } catch (error) {
    console.error('Cash collection report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch cash collection report' 
    });
  }
});



// ===== DELIVERY MANAGEMENT ROUTES =====

// Assign delivery person to order
router.patch('/orders/:orderId/assign', authenticateToken, requireEmployee, [
  body('deliveryPersonId').isMongoId().withMessage('Valid delivery person ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { orderId } = req.params;
    const { deliveryPersonId } = req.body;

    // Verify delivery person exists and is active
    const deliveryPerson = await User.findOne({
      _id: deliveryPersonId,
      role: 'delivery',
      isActive: true
    });

    if (!deliveryPerson) {
      return res.status(404).json({ 
        success: false,
        message: 'Delivery person not found or inactive' 
      });
    }

    // Find and update the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check if order is eligible for delivery assignment
    if (order.orderType !== 'delivery') {
      return res.status(400).json({ 
        success: false,
        message: 'Only delivery orders can be assigned to delivery persons' 
      });
    }

    // Update order with delivery person assignment
    order.assignedTo = deliveryPersonId;
    order.status = 'out for delivery'; // Set status to out for delivery when assigned
    order.updatedAt = new Date();

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('items.menuItem', 'name price image');
    await order.populate('assignedTo', 'name phone department');

    res.json({
      success: true,
      message: 'Order assigned to delivery person successfully',
      order
    });
  } catch (error) {
    console.error('Error assigning delivery person:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to assign delivery person' 
    });
  }
});

// Get all delivery persons for assignment
router.get('/delivery-persons', authenticateToken, requireEmployee, async (req, res) => {
  try {
    console.log('🚚 [DELIVERY-PERSONS] Route accessed by user:', req.user?.role, req.user?.name);
    const deliveryPersons = await User.find({
      role: 'delivery',
      isActive: true
    }).select('name email phone department _id').sort({ name: 1 });

    // Get current workload for each delivery person
    const deliveryPersonsWithWorkload = await Promise.all(
      deliveryPersons.map(async (person) => {
        const activeOrders = await Order.countDocuments({
          assignedTo: person._id,
          status: { $in: ['ready for pickup', 'out for delivery'] }
        });

        return {
          ...person.toObject(),
          activeOrders
        };
      })
    );

    // Sort by workload (ascending) so least busy appears first
    deliveryPersonsWithWorkload.sort((a, b) => a.activeOrders - b.activeOrders);

    console.log('🚚 [DELIVERY-PERSONS] Found', deliveryPersonsWithWorkload.length, 'delivery persons');
    
    res.json({
      success: true,
      data: deliveryPersonsWithWorkload
    });
  } catch (error) {
    console.error('Error fetching delivery persons:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch delivery persons' 
    });
  }
});

// Get delivery statistics for admin dashboard
router.get('/delivery-stats', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalDeliveryOrders,
      todayDeliveryOrders,
      pendingDeliveries,
      outForDelivery,
      deliveredToday,
      avgDeliveryTime
    ] = await Promise.all([
      Order.countDocuments({ orderType: 'delivery' }),
      Order.countDocuments({ 
        orderType: 'delivery',
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Order.countDocuments({ 
        orderType: 'delivery',
        status: 'ready for pickup'
      }),
      Order.countDocuments({ 
        orderType: 'delivery',
        status: 'out for delivery'
      }),
      Order.countDocuments({ 
        orderType: 'delivery',
        status: 'delivered',
        actualDeliveryTime: { $gte: today, $lt: tomorrow }
      }),
      Order.aggregate([
        {
          $match: {
            orderType: 'delivery',
            status: 'delivered',
            estimatedDeliveryTime: { $exists: true },
            actualDeliveryTime: { $exists: true }
          }
        },
        {
          $project: {
            deliveryTime: {
              $divide: [
                { $subtract: ['$actualDeliveryTime', '$estimatedDeliveryTime'] },
                1000 * 60 // Convert to minutes
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$deliveryTime' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalDeliveryOrders,
        todayDeliveryOrders,
        pendingDeliveries,
        outForDelivery,
        deliveredToday,
        avgDeliveryTime: avgDeliveryTime[0]?.avgTime || 0
      }
    });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch delivery statistics' 
    });
  }
});

module.exports = router;