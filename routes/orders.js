const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const InventoryService = require('../services/inventoryService');
const { authenticateToken, requireEmployee } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const router = express.Router();

// Get user's orders
router.get('/my-orders', authenticateToken, [
  query('status').optional().isIn(['pending', 'order placed', 'cooking in progress', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid query parameters', 
        errors: errors.array() 
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const filter = { customer: req.user._id };
    
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('items.menuItem', 'name price image')
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
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Create new order
router.post('/', authenticateToken, [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.menuItem').isMongoId().withMessage('Invalid menu item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.specialInstructions').optional().isLength({ max: 200 }).withMessage('Special instructions too long'),
  body('orderType').isIn(['dine in', 'take away', 'delivery']).withMessage('Invalid order type'),
  body('tableNumber').optional().isInt({ min: 1 }).withMessage('Invalid table number'),
  body('paymentMethod').isIn(['cash', 'card', 'digital-wallet']).withMessage('Invalid payment method'),
  body('deliveryAddress').optional().isObject().withMessage('Invalid delivery address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { items, orderType, tableNumber, deliveryAddress, paymentMethod } = req.body;

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
    const deliveryFee = orderType === 'delivery' ? 5.00 : 0;
    const total = subtotal + deliveryFee;

    // Create order
    const order = new Order({
      customer: req.user._id,
      items: orderItems,
      orderType,
      tableNumber: orderType === 'dine in' ? tableNumber : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      paymentMethod,
      subtotal,
      tax,
      deliveryFee,
      total,
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    });

    await order.save();
    await order.populate('items.menuItem', 'name price image');
    await order.populate('customer', 'name email phone');

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Order creation error:', error);
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

// Get single order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.menuItem', 'name price image')
      .populate('assignedTo', 'name role');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user can access this order
    if (order.customer._id.toString() !== req.user._id.toString() && 
        !['employee', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Order fetch error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Update order status (employee/admin only)
router.patch('/:id/status', authenticateToken, requireEmployee, [
  body('status').isIn(['pending', 'order placed', 'cooking in progress', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    if (notes) order.notes = notes;
    
    let inventoryDeductionResult = null;
    
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
      
      console.log(`🚚 Order ${order.orderNumber || order._id} marked as delivered. Starting inventory deduction...`);
      console.log('Order items:', JSON.stringify(order.items, null, 2));
      
      // Automatically deduct main ingredients from inventory
      try {
        inventoryDeductionResult = await InventoryService.deductMainIngredients(order.items);
        
        console.log('📊 Inventory deduction result:', {
          success: inventoryDeductionResult.success,
          deductions: inventoryDeductionResult.deductions.length,
          errors: inventoryDeductionResult.errors.length
        });
        
        if (!inventoryDeductionResult.success && inventoryDeductionResult.errors.length > 0) {
          console.warn('⚠️  Inventory deduction warnings for order', order.orderNumber, ':', inventoryDeductionResult.errors);
        }
        
        if (inventoryDeductionResult.success && inventoryDeductionResult.deductions.length > 0) {
          console.log('✅ Inventory successfully deducted:', inventoryDeductionResult.deductions);
        }
      } catch (inventoryError) {
        console.error('❌ Failed to deduct inventory for order', order.orderNumber, ':', inventoryError);
        // Don't fail the order status update if inventory deduction fails
        // Just log the error and continue
      }
    }

    await order.save();
    await order.populate('items.menuItem', 'name price image');
    await order.populate('customer', 'name email phone');

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
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// Get all orders (employee/admin only)
router.get('/', authenticateToken, requireEmployee, [
  query('status').optional().isIn(['pending', 'order placed', 'cooking in progress', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled']),
  query('orderType').optional().isIn(['dine in', 'take away', 'delivery']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid query parameters', 
        errors: errors.array() 
      });
    }

    const { status, orderType, page = 1, limit = 20, all } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;

    let orders, total;
    
    if (all === 'true') {
      // Return all orders without pagination
      [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('customer', 'name email phone')
          .populate('items.menuItem', 'name price')
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
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Order.countDocuments(filter)
      ]);
    }

    res.json({
      orders,
      pagination: all === 'true' ? {
        page: 1,
        limit: total,
        total,
        pages: 1
      } : {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get orders by customer phone number (for customer service)
router.get('/by-phone/:phone', authenticateToken, requireEmployee, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid query parameters', 
        errors: errors.array() 
      });
    }

    const { phone } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate phone number format
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Use the static method we created in the Order model
    const allOrders = await Order.findByCustomerPhone(phone);
    
    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = allOrders.slice(skip, skip + parseInt(limit));
    const total = allOrders.length;

    res.json({
      orders,
      customerPhone: phone,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Orders by phone fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Check inventory availability for order items
router.post('/check-inventory', authenticateToken, requireEmployee, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { items } = req.body;
    const result = await InventoryService.checkInventoryAvailability(items);

    res.json(result);
  } catch (error) {
    console.error('Inventory check error:', error);
    res.status(500).json({ message: 'Failed to check inventory availability' });
  }
});

// Get low stock alerts
router.get('/inventory/low-stock', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const result = await InventoryService.getLowStockAlerts();
    res.json(result);
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({ message: 'Failed to get low stock alerts' });
  }
});

// Download orders report as Excel
router.get('/report/excel', authenticateToken, requireEmployee, [
  query('fromDate').isISO8601().withMessage('Valid from date is required'),
  query('toDate').isISO8601().withMessage('Valid to date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Invalid query parameters', 
        errors: errors.array() 
      });
    }

    const { fromDate, toDate } = req.query;
    
    // Validate date range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    if (startDate > endDate) {
      return res.status(400).json({ message: 'From date cannot be later than to date' });
    }

    // Set time to start and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch orders within date range
    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('customer', 'name email phone')
    .populate('items.menuItem', 'name price')
    .sort({ createdAt: -1 });

    // Calculate totals
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders Report');

    // Set column widths
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Customer Phone', key: 'customerPhone', width: 15 },
      { header: 'Customer Email', key: 'customerEmail', width: 25 },
      { header: 'Order Type', key: 'orderType', width: 12 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Quantity', key: 'totalQuantity', width: 10 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Tax', key: 'tax', width: 10 },
      { header: 'Delivery Fee', key: 'deliveryFee', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Table Number', key: 'tableNumber', width: 12 },
      { header: 'Order Date', key: 'orderDate', width: 20 },
      { header: 'Delivery Address', key: 'deliveryAddress', width: 30 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Add data rows
    orders.forEach((order, index) => {
      const itemsText = order.items.map(item => 
        `${item.menuItem?.name || 'Unknown'} (${item.quantity}x)`
      ).join(', ');
      
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      
      const deliveryAddress = order.deliveryAddress ? 
        `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}`.trim().replace(/^,\s*/, '') : '';

      worksheet.addRow({
        orderId: order._id.toString(),
        customerName: order.customer?.name || 'Guest',
        customerPhone: order.customer?.phone || 'N/A',
        customerEmail: order.customer?.email || 'N/A',
        orderType: order.orderType || 'pickup',
        items: itemsText,
        totalQuantity: totalQuantity,
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        deliveryFee: order.deliveryFee || 0,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod || 'card',
        tableNumber: order.tableNumber || 'N/A',
        orderDate: order.createdAt.toLocaleString(),
        deliveryAddress: deliveryAddress || 'N/A'
      });

      // Alternate row colors
      const row = worksheet.getRow(index + 2);
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }
    });

    // Add summary section
    const summaryStartRow = orders.length + 3;
    
    // Add summary title
    const summaryTitleRow = worksheet.getRow(summaryStartRow);
    summaryTitleRow.getCell(1).value = 'SUMMARY';
    summaryTitleRow.getCell(1).font = { bold: true, size: 14 };
    summaryTitleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E9ECEF' }
    };

    // Add summary data
    worksheet.getRow(summaryStartRow + 1).getCell(1).value = 'Report Period:';
    worksheet.getRow(summaryStartRow + 1).getCell(2).value = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    worksheet.getRow(summaryStartRow + 2).getCell(1).value = 'Total Orders:';
    worksheet.getRow(summaryStartRow + 2).getCell(2).value = totalOrders;
    worksheet.getRow(summaryStartRow + 2).getCell(2).font = { bold: true };
    
    worksheet.getRow(summaryStartRow + 3).getCell(1).value = 'Total Amount:';
    worksheet.getRow(summaryStartRow + 3).getCell(2).value = `₹${totalAmount.toFixed(2)}`;
    worksheet.getRow(summaryStartRow + 3).getCell(2).font = { bold: true };

    // Add status breakdown
    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    let statusRowIndex = summaryStartRow + 5;
    worksheet.getRow(statusRowIndex).getCell(1).value = 'Status Breakdown:';
    worksheet.getRow(statusRowIndex).getCell(1).font = { bold: true };
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      statusRowIndex++;
      worksheet.getRow(statusRowIndex).getCell(1).value = `${status}:`;
      worksheet.getRow(statusRowIndex).getCell(2).value = count;
    });

    // Set response headers for Excel download
    const filename = `orders-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel report generation error:', error);
    res.status(500).json({ message: 'Failed to generate Excel report' });
  }
});

module.exports = router;