const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Get all available delivery persons
router.get('/persons', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const deliveryPersons = await User.find({
      role: 'delivery',
      isActive: true
    }).select('name phone department _id');

    res.json({
      success: true,
      deliveryPersons
    });
  } catch (error) {
    console.error('Error fetching delivery persons:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch delivery persons' 
    });
  }
});

// Get orders assigned to a specific delivery person
router.get('/orders/:deliveryPersonId', authenticateToken, async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Check if user is the delivery person or has employee/admin privileges
    if (req.user.role === 'delivery' && req.user._id.toString() !== deliveryPersonId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const filter = { 
      assignedTo: deliveryPersonId,
      orderType: 'delivery'
    };
    
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('items.menuItem', 'name price image')
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch delivery orders' 
    });
  }
});

// Mark order as picked up by delivery person
router.patch('/orders/:orderId/pickup', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if user is assigned to this order or has employee/admin privileges
    if (req.user.role === 'delivery' && 
        (!order.assignedTo || order.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this order' 
      });
    }

    // Update order status to out for delivery
    order.status = 'out for delivery';
    order.updatedAt = new Date();
    order.pickedUpAt = new Date();
    
    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: 'out for delivery',
      timestamp: new Date(),
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      notes: `Order picked up by ${req.user.name || 'delivery person'}`
    });
    
    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('items.menuItem', 'name price image');
    await order.populate('assignedTo', 'name phone');

    res.json({
      success: true,
      message: 'Order marked as picked up',
      order
    });
  } catch (error) {
    console.error('Error marking order as picked up:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark order as picked up' 
    });
  }
});

// Mark order as delivered by delivery person
router.patch('/orders/:orderId/deliver', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if user is assigned to this order or has employee/admin privileges
    if (req.user.role === 'delivery' && 
        (!order.assignedTo || order.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this order' 
      });
    }

    // Update order status to delivered
    order.status = 'delivered';
    order.actualDeliveryTime = new Date();
    order.updatedAt = new Date();
    order.deliveredAt = new Date();
    if (notes) order.deliveryNotes = notes;
    
    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: 'delivered',
      timestamp: new Date(),
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      notes: notes || `Order delivered by ${req.user.name || 'delivery person'}`
    });
    
    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('items.menuItem', 'name price image');
    await order.populate('assignedTo', 'name phone');

    res.json({
      success: true,
      message: 'Order marked as delivered',
      order
    });
  } catch (error) {
    console.error('Error marking order as delivered:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark order as delivered' 
    });
  }
});

// Get delivery person statistics
router.get('/stats/:deliveryPersonId', authenticateToken, async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;

    // Check if user is the delivery person or has employee/admin privileges
    if (req.user.role === 'delivery' && req.user._id.toString() !== deliveryPersonId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalDeliveries,
      todayDeliveries,
      pendingOrders,
      todayEarnings
    ] = await Promise.all([
      Order.countDocuments({
        assignedTo: deliveryPersonId,
        status: 'delivered'
      }),
      Order.countDocuments({
        assignedTo: deliveryPersonId,
        status: 'delivered',
        actualDeliveryTime: { $gte: today, $lt: tomorrow }
      }),
      Order.countDocuments({
        assignedTo: deliveryPersonId,
        status: { $in: ['ready for pickup', 'out for delivery'] }
      }),
      Order.aggregate([
        {
          $match: {
            assignedTo: deliveryPersonId,
            status: 'delivered',
            actualDeliveryTime: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$deliveryFee' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalDeliveries,
        todayDeliveries,
        pendingOrders,
        todayEarnings: todayEarnings[0]?.total || 0
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

// Update delivery person location
router.post('/location/update', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only delivery persons can update location' 
      });
    }

    // Find the delivery person's user record
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update location
    user.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: parseFloat(accuracy) || null,
      lastUpdated: new Date()
    };
    
    await user.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: user.currentLocation
    });
  } catch (error) {
    console.error('Error updating delivery person location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update location' 
    });
  }
});

// Get delivery person's current location (for admin/customer tracking)
router.get('/location/:deliveryPersonId', authenticateToken, async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    
    // Only allow admin, employee, or the delivery person themselves to access location
    if (req.user.role === 'customer') {
      // Check if customer has an active order with this delivery person
      const activeOrder = await Order.findOne({
        customer: req.user._id,
        assignedTo: deliveryPersonId,
        status: { $in: ['out for delivery'] }
      });
      
      if (!activeOrder) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
    } else if (req.user.role === 'delivery' && req.user._id.toString() !== deliveryPersonId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const User = require('../models/User');
    const deliveryPerson = await User.findById(deliveryPersonId)
      .select('name phone currentLocation');
    
    if (!deliveryPerson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery person not found' 
      });
    }

    res.json({
      success: true,
      deliveryPerson: {
        id: deliveryPerson._id,
        name: deliveryPerson.name,
        phone: deliveryPerson.phone,
        currentLocation: deliveryPerson.currentLocation
      }
    });
  } catch (error) {
    console.error('Error fetching delivery person location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch location' 
    });
  }
});

// Get order tracking information (for customers)
router.get('/track/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('customer', 'name phone email')
      .populate('assignedTo', 'name phone currentLocation')
      .populate('items.menuItem', 'name price');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if user has access to this order
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Prepare tracking information
    const trackingInfo = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime,
      statusHistory: order.statusHistory || [],
      customer: {
        name: order.customer.name,
        phone: order.customer.phone
      },
      deliveryAddress: order.deliveryAddress,
      items: order.items.map(item => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: order.totalAmount
    };

    // Add delivery person info if assigned and order is out for delivery
    if (order.assignedTo && ['out for delivery'].includes(order.status)) {
      trackingInfo.deliveryPerson = {
        name: order.assignedTo.name,
        phone: order.assignedTo.phone,
        currentLocation: order.assignedTo.currentLocation
      };
    }

    res.json({
      success: true,
      tracking: trackingInfo
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tracking information' 
    });
  }
});

module.exports = router;