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
    
    await CustomerActivityService.trackCartAdd(
      customerId,
      sessionId,
      menuItemId,
      quantity,
      price,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    res.json({ success: true, message: 'Cart addition tracked' });
  } catch (error) {
    console.error('Error tracking cart addition:', error);
    res.status(500).json({ success: false, message: 'Failed to track cart addition' });
  }
});

// Track cart item removal
router.post('/track/cart-remove', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, previousQuantity, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    await CustomerActivityService.trackCartRemove(
      customerId,
      sessionId,
      menuItemId,
      previousQuantity,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    res.json({ success: true, message: 'Cart removal tracked' });
  } catch (error) {
    console.error('Error tracking cart removal:', error);
    res.status(500).json({ success: false, message: 'Failed to track cart removal' });
  }
});

// Track cart item quantity update
router.post('/track/cart-update', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, newQuantity, previousQuantity, price, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    await CustomerActivityService.trackCartUpdate(
      customerId,
      sessionId,
      menuItemId,
      newQuantity,
      previousQuantity,
      price,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    res.json({ success: true, message: 'Cart update tracked' });
  } catch (error) {
    console.error('Error tracking cart update:', error);
    res.status(500).json({ success: false, message: 'Failed to track cart update' });
  }
});

// Track order placement
router.post('/track/order-placed', authenticateToken, async (req, res) => {
  try {
    const { orderId, cartTotal, cartItemCount } = req.body;
    const customerId = req.user._id;
    const sessionId = req.headers['x-session-id'] || `session_${customerId}_${Date.now()}`;
    
    await CustomerActivityService.trackOrderPlaced(
      customerId,
      sessionId,
      orderId,
      { cartTotal, cartItemCount, metadata: { timestamp: new Date() } }
    );
    
    res.json({ success: true, message: 'Order placement tracked' });
  } catch (error) {
    console.error('Error tracking order placement:', error);
    res.status(500).json({ success: false, message: 'Failed to track order placement' });
  }
});

module.exports = router;