const express = require('express');
const CustomerActivityService = require('../services/customerActivityService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Track cart item addition
router.post('/track/cart-add', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, quantity, price, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    console.log('Backend: Tracking cart addition for user:', {
      customerId,
      sessionId,
      menuItemId,
      quantity,
      price,
      cartTotal,
      cartItemCount
    });
    
    await CustomerActivityService.trackCartAdd(
      customerId,
      sessionId,
      menuItemId,
      quantity,
      price,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    console.log('Backend: Cart addition tracked successfully');
    res.json({ success: true, message: 'Cart addition tracked' });
  } catch (error) {
    console.error('Error tracking cart addition:', error);
    res.status(500).json({ success: false, message: 'Failed to track cart addition', error: error.message });
  }
});

// Track cart item removal
router.post('/track/cart-remove', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, previousQuantity, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    console.log('Backend: Tracking cart removal for user:', {
      customerId,
      sessionId,
      menuItemId,
      previousQuantity,
      cartTotal,
      cartItemCount
    });
    
    await CustomerActivityService.trackCartRemove(
      customerId,
      sessionId,
      menuItemId,
      previousQuantity,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    console.log('Backend: Cart removal tracked successfully');
    res.json({ success: true, message: 'Cart removal tracked' });
  } catch (error) {
    console.error('Error tracking cart removal:', error);
    res.status(500).json({ success: false, message: 'Failed to track cart removal', error: error.message });
  }
});

// Track cart item quantity update
router.post('/track/cart-update', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, newQuantity, previousQuantity, price, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    console.log('Backend: Tracking cart update for user:', {
      customerId,
      sessionId,
      menuItemId,
      newQuantity,
      previousQuantity,
      price,
      cartTotal,
      cartItemCount
    });
    
    await CustomerActivityService.trackCartUpdate(
      customerId,
      sessionId,
      menuItemId,
      newQuantity,
      previousQuantity,
      price,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    console.log('Backend: Cart update tracked successfully');
    res.json({ success: true, message: 'Cart update tracked' });
  } catch (error) {
    console.error('Error tracking cart update:', error);
    res.status(500).json({ success: false, message: 'Failed to track cart update', error: error.message });
  }
});

// Track order placement
router.post('/track/order-placed', authenticateToken, async (req, res) => {
  try {
    const { orderId, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    console.log('Backend: Tracking order placement for user:', {
      customerId,
      sessionId,
      orderId,
      cartTotal,
      cartItemCount
    });
    
    await CustomerActivityService.trackOrderPlaced(
      customerId,
      sessionId,
      orderId,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    console.log('Backend: Order placement tracked successfully');
    res.json({ success: true, message: 'Order placement tracked' });
  } catch (error) {
    console.error('Error tracking order placement:', error);
    res.status(500).json({ success: false, message: 'Failed to track order placement', error: error.message });
  }
});

// Test endpoint to check if tracking is working
router.get('/test', authenticateToken, async (req, res) => {
  try {
    console.log('Test endpoint called by user:', req.user._id);
    res.json({ 
      success: true, 
      message: 'Cart tracking routes are working',
      user: req.user._id,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ success: false, message: 'Test failed' });
  }
});

module.exports = router;