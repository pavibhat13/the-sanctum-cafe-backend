const express = require('express');
const webpush = require('web-push');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@sanctumcafe.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store subscriptions in memory (in production, use a database)
const subscriptions = new Map();

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription, userId, userRole } = req.body;

    if (!subscription || !userId || !userRole) {
      return res.status(400).json({
        error: 'Missing required fields: subscription, userId, userRole'
      });
    }

    // Validate VAPID keys are configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(500).json({
        error: 'VAPID keys not configured on server'
      });
    }

    // Store subscription
    subscriptions.set(userId, {
      subscription,
      userRole,
      timestamp: new Date().toISOString()
    });

    console.log(`User ${userId} (${userRole}) subscribed to push notifications`);

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({
      error: 'Failed to subscribe to push notifications',
      details: error.message
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    // Remove subscription
    const removed = subscriptions.delete(userId);

    console.log(`User ${userId} unsubscribed from push notifications`);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
      removed
    });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe from push notifications',
      details: error.message
    });
  }
});

// Send notification to specific roles (e.g., admin, employee)
router.post('/send-order-notification', authenticateToken, async (req, res) => {
  try {
    const { type, title, body, orderData, targetRoles } = req.body;

    if (!title || !body || !targetRoles) {
      return res.status(400).json({
        error: 'Missing required fields: title, body, targetRoles'
      });
    }

    const payload = JSON.stringify({
      type: type || 'new_order',
      title,
      body,
      orderData,
      timestamp: new Date().toISOString()
    });

    const notifications = [];
    let successCount = 0;
    let failureCount = 0;

    // Send to users with matching roles
    for (const [userId, userData] of subscriptions.entries()) {
      if (targetRoles.includes(userData.userRole)) {
        try {
          await webpush.sendNotification(userData.subscription, payload);
          notifications.push({ userId, status: 'sent' });
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to user ${userId}:`, error);
          notifications.push({ userId, status: 'failed', error: error.message });
          failureCount++;

          // Remove invalid subscriptions
          if (error.statusCode === 410) {
            subscriptions.delete(userId);
          }
        }
      }
    }

    console.log(`Order notification sent: ${successCount} successful, ${failureCount} failed`);

    res.json({
      success: true,
      message: 'Order notification processing completed',
      results: {
        successCount,
        failureCount,
        notifications
      }
    });
  } catch (error) {
    console.error('Error sending order notification:', error);
    res.status(500).json({
      error: 'Failed to send order notification',
      details: error.message
    });
  }
});

// Send notification to specific user (e.g., customer status update)
router.post('/send-status-notification', authenticateToken, async (req, res) => {
  try {
    const { type, title, body, orderData, customerId } = req.body;

    if (!title || !body || !customerId) {
      return res.status(400).json({
        error: 'Missing required fields: title, body, customerId'
      });
    }

    const userData = subscriptions.get(customerId);
    if (!userData) {
      return res.json({
        success: true,
        message: 'User not subscribed to push notifications'
      });
    }

    const payload = JSON.stringify({
      type: type || 'order_status',
      title,
      body,
      orderData,
      timestamp: new Date().toISOString()
    });

    try {
      await webpush.sendNotification(userData.subscription, payload);
      console.log(`Status notification sent to user ${customerId}`);

      res.json({
        success: true,
        message: 'Status notification sent successfully'
      });
    } catch (error) {
      console.error(`Failed to send status notification to user ${customerId}:`, error);

      // Remove invalid subscription
      if (error.statusCode === 410) {
        subscriptions.delete(customerId);
      }

      res.status(500).json({
        error: 'Failed to send status notification',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error sending status notification:', error);
    res.status(500).json({
      error: 'Failed to send status notification',
      details: error.message
    });
  }
});

// Get subscription status
router.get('/status', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const isSubscribed = subscriptions.has(userId);
    const subscription = subscriptions.get(userId);

    res.json({
      success: true,
      isSubscribed,
      subscription: subscription ? {
        userRole: subscription.userRole,
        timestamp: subscription.timestamp
      } : null,
      totalSubscriptions: subscriptions.size
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      details: error.message
    });
  }
});

// Test notification endpoint (for development)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = subscriptions.get(userId);

    if (!userData) {
      return res.status(400).json({
        error: 'User not subscribed to push notifications'
      });
    }

    const payload = JSON.stringify({
      type: 'test',
      title: 'Test Notification',
      body: 'This is a test notification from Sanctum Cafe',
      timestamp: new Date().toISOString()
    });

    await webpush.sendNotification(userData.subscription, payload);

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      details: error.message
    });
  }
});

module.exports = router;