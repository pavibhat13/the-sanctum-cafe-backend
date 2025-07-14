const CustomerActivity = require('../models/CustomerActivity');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

class CustomerActivityService {
  // Track customer login
  static async trackLogin(customerId, sessionId, details = {}) {
    try {
      const activity = new CustomerActivity({
        customer: customerId,
        sessionId,
        activityType: 'login',
        details: {
          loginMethod: details.loginMethod || 'email',
          ipAddress: details.ipAddress,
          userAgent: details.userAgent,
          metadata: details.metadata
        }
      });
      
      await activity.save();
      
      // Emit real-time event to admin rooms only
      const io = require('../server').io;
      if (io) {
        const populatedActivity = await activity.populate('customer', 'name email');
        io.to('admin').emit('customer_activity', {
          type: 'login',
          activity: populatedActivity,
          timestamp: new Date()
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error tracking login:', error);
      throw error;
    }
  }

  // Track customer logout
  static async trackLogout(customerId, sessionId, details = {}) {
    try {
      // Find the login activity to calculate session duration
      const loginActivity = await CustomerActivity.findOne({
        customer: customerId,
        sessionId,
        activityType: 'login'
      }).sort({ timestamp: -1 });

      const activity = new CustomerActivity({
        customer: customerId,
        sessionId,
        activityType: 'logout',
        details: {
          loginTime: loginActivity?.timestamp,
          sessionDuration: loginActivity ? Date.now() - loginActivity.timestamp : null,
          ipAddress: details.ipAddress,
          metadata: details.metadata
        }
      });
      
      await activity.save();
      
      // Emit real-time event to admin rooms only
      const io = require('../server').io;
      if (io) {
        const populatedActivity = await activity.populate('customer', 'name email');
        io.to('admin').emit('customer_activity', {
          type: 'logout',
          activity: populatedActivity,
          timestamp: new Date()
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error tracking logout:', error);
      throw error;
    }
  }

  // Track cart item addition
  static async trackCartAdd(customerId, sessionId, menuItemId, quantity, price, cartDetails = {}) {
    try {
      const activity = new CustomerActivity({
        customer: customerId,
        sessionId,
        activityType: 'cart_add',
        details: {
          menuItem: menuItemId,
          quantity,
          price,
          cartTotal: cartDetails.cartTotal,
          cartItemCount: cartDetails.cartItemCount,
          metadata: cartDetails.metadata
        }
      });
      
      await activity.save();
      
      // Emit real-time event to admin rooms only
      const io = require('../server').io;
      if (io) {
        const populatedActivity = await activity
          .populate('customer', 'name email')
          .populate('details.menuItem', 'name price category image');
        
        io.to('admin').emit('customer_activity', {
          type: 'cart_add',
          activity: populatedActivity,
          timestamp: new Date()
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error tracking cart add:', error);
      throw error;
    }
  }

  // Track cart item removal
  static async trackCartRemove(customerId, sessionId, menuItemId, previousQuantity, cartDetails = {}) {
    try {
      const activity = new CustomerActivity({
        customer: customerId,
        sessionId,
        activityType: 'cart_remove',
        details: {
          menuItem: menuItemId,
          previousQuantity,
          quantity: 0,
          cartTotal: cartDetails.cartTotal,
          cartItemCount: cartDetails.cartItemCount,
          metadata: cartDetails.metadata
        }
      });
      
      await activity.save();
      
      // Emit real-time event
      const io = require('../server').io;
      if (io) {
        const populatedActivity = await activity
          .populate('customer', 'name email')
          .populate('details.menuItem', 'name price category image');
        
        io.to('admin').emit('customer_activity', {
          type: 'cart_remove',
          activity: populatedActivity,
          timestamp: new Date()
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error tracking cart remove:', error);
      throw error;
    }
  }

  // Track cart item quantity update
  static async trackCartUpdate(customerId, sessionId, menuItemId, newQuantity, previousQuantity, price, cartDetails = {}) {
    try {
      const activity = new CustomerActivity({
        customer: customerId,
        sessionId,
        activityType: 'cart_update',
        details: {
          menuItem: menuItemId,
          quantity: newQuantity,
          previousQuantity,
          price,
          cartTotal: cartDetails.cartTotal,
          cartItemCount: cartDetails.cartItemCount,
          metadata: cartDetails.metadata
        }
      });
      
      await activity.save();
      
      // Emit real-time event
      const io = require('../server').io;
      if (io) {
        const populatedActivity = await activity
          .populate('customer', 'name email')
          .populate('details.menuItem', 'name price category image');
        
        io.to('admin').emit('customer_activity', {
          type: 'cart_update',
          activity: populatedActivity,
          timestamp: new Date()
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error tracking cart update:', error);
      throw error;
    }
  }

  // Track order placement
  static async trackOrderPlaced(customerId, sessionId, orderId, cartDetails = {}) {
    try {
      const activity = new CustomerActivity({
        customer: customerId,
        sessionId,
        activityType: 'order_placed',
        details: {
          orderId,
          cartTotal: cartDetails.cartTotal,
          cartItemCount: cartDetails.cartItemCount,
          metadata: cartDetails.metadata
        }
      });
      
      await activity.save();
      
      // Emit real-time event
      const io = require('../server').io;
      if (io) {
        const populatedActivity = await activity
          .populate('customer', 'name email')
          .populate('details.orderId', 'total items status');
        
        io.to('admin').emit('customer_activity', {
          type: 'order_placed',
          activity: populatedActivity,
          timestamp: new Date()
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error tracking order placed:', error);
      throw error;
    }
  }

  // Get customer activity analytics with enhanced date filtering
  static async getCustomerAnalytics(dateRange = '30d', customerId = null, fromDate = null, toDate = null) {
    try {
      let startDate, endDate;
      
      // Handle custom date range
      if (fromDate && toDate) {
        startDate = new Date(fromDate);
        endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999); // End of day
      } else {
        // Handle predefined ranges
        endDate = new Date();
        startDate = new Date();
        
        switch (dateRange) {
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
          case '1y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          default:
            startDate.setDate(startDate.getDate() - 30);
        }
      }

      const matchFilter = {
        timestamp: { $gte: startDate, $lte: endDate }
      };

      if (customerId) {
        matchFilter.customer = customerId;
      }

      // Get activity summary
      const activitySummary = await CustomerActivity.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 },
            uniqueCustomers: { $addToSet: '$customer' }
          }
        },
        {
          $project: {
            activityType: '$_id',
            count: 1,
            uniqueCustomers: { $size: '$uniqueCustomers' }
          }
        }
      ]);

      // Get recent activities with customer and item details
      const recentActivities = await CustomerActivity.find(matchFilter)
        .populate('customer', 'name email phone')
        .populate('details.menuItem', 'name price category image')
        .populate('details.orderId', 'total items status')
        .sort({ timestamp: -1 })
        .limit(50);

      // Get cart abandonment data
      const cartAbandonments = await CustomerActivity.aggregate([
        {
          $match: {
            ...matchFilter,
            activityType: { $in: ['cart_add', 'cart_update', 'order_placed'] }
          }
        },
        {
          $group: {
            _id: '$sessionId',
            customer: { $first: '$customer' },
            hasCartActivity: {
              $sum: {
                $cond: [
                  { $in: ['$activityType', ['cart_add', 'cart_update']] },
                  1,
                  0
                ]
              }
            },
            hasOrder: {
              $sum: {
                $cond: [{ $eq: ['$activityType', 'order_placed'] }, 1, 0]
              }
            },
            lastActivity: { $max: '$timestamp' },
            cartTotal: { $last: '$details.cartTotal' }
          }
        },
        {
          $match: {
            hasCartActivity: { $gt: 0 },
            hasOrder: 0
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerInfo'
          }
        },
        { $unwind: '$customerInfo' },
        { $sort: { lastActivity: -1 } },
        { $limit: 20 }
      ]);

      // Get top active customers
      const topActiveCustomers = await CustomerActivity.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$customer',
            totalActivities: { $sum: 1 },
            cartActivities: {
              $sum: {
                $cond: [
                  { $in: ['$activityType', ['cart_add', 'cart_remove', 'cart_update']] },
                  1,
                  0
                ]
              }
            },
            orders: {
              $sum: {
                $cond: [{ $eq: ['$activityType', 'order_placed'] }, 1, 0]
              }
            },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        { $sort: { totalActivities: -1 } },
        { $limit: 10 }
      ]);

      // Get cart conversion statistics
      const cartConversionStats = await CustomerActivity.aggregate([
        {
          $match: {
            ...matchFilter,
            activityType: { $in: ['cart_add', 'cart_update', 'order_placed'] }
          }
        },
        {
          $group: {
            _id: '$sessionId',
            customer: { $first: '$customer' },
            hasCartActivity: {
              $sum: {
                $cond: [
                  { $in: ['$activityType', ['cart_add', 'cart_update']] },
                  1,
                  0
                ]
              }
            },
            hasOrder: {
              $sum: {
                $cond: [{ $eq: ['$activityType', 'order_placed'] }, 1, 0]
              }
            },
            maxCartTotal: { $max: '$details.cartTotal' },
            maxCartItems: { $max: '$details.cartItemCount' },
            firstCartActivity: { $min: '$timestamp' },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            sessionsWithCart: {
              $sum: { $cond: [{ $gt: ['$hasCartActivity', 0] }, 1, 0] }
            },
            convertedSessions: {
              $sum: { $cond: [{ $gt: ['$hasOrder', 0] }, 1, 0] }
            },
            abandonedSessions: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$hasCartActivity', 0] }, { $eq: ['$hasOrder', 0] }] },
                  1,
                  0
                ]
              }
            },
            totalCartValue: { $sum: '$maxCartTotal' },
            averageCartValue: { $avg: '$maxCartTotal' },
            averageCartItems: { $avg: '$maxCartItems' }
          }
        }
      ]);

      // Get detailed cart activity breakdown
      const cartActivityBreakdown = await CustomerActivity.aggregate([
        {
          $match: {
            ...matchFilter,
            activityType: { $in: ['cart_add', 'cart_remove', 'cart_update'] }
          }
        },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$details.quantity' },
            totalValue: { $sum: { $multiply: ['$details.quantity', '$details.price'] } },
            uniqueItems: { $addToSet: '$details.menuItem' },
            uniqueCustomers: { $addToSet: '$customer' }
          }
        },
        {
          $project: {
            activityType: '$_id',
            count: 1,
            totalQuantity: 1,
            totalValue: 1,
            uniqueItems: { $size: '$uniqueItems' },
            uniqueCustomers: { $size: '$uniqueCustomers' }
          }
        }
      ]);

      // Get popular items from cart activities
      const popularCartItems = await CustomerActivity.aggregate([
        {
          $match: {
            ...matchFilter,
            activityType: 'cart_add',
            'details.menuItem': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$details.menuItem',
            addCount: { $sum: 1 },
            totalQuantity: { $sum: '$details.quantity' },
            totalValue: { $sum: { $multiply: ['$details.quantity', '$details.price'] } },
            uniqueCustomers: { $addToSet: '$customer' }
          }
        },
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
            menuItem: 1,
            addCount: 1,
            totalQuantity: 1,
            totalValue: 1,
            uniqueCustomers: { $size: '$uniqueCustomers' }
          }
        },
        { $sort: { addCount: -1 } },
        { $limit: 10 }
      ]);

      // Get hourly activity pattern
      const hourlyPattern = await CustomerActivity.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 },
            cartActivities: {
              $sum: {
                $cond: [
                  { $in: ['$activityType', ['cart_add', 'cart_remove', 'cart_update']] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      const conversionStats = cartConversionStats[0] || {
        totalSessions: 0,
        sessionsWithCart: 0,
        convertedSessions: 0,
        abandonedSessions: 0,
        totalCartValue: 0,
        averageCartValue: 0,
        averageCartItems: 0
      };

      const conversionRate = conversionStats.sessionsWithCart > 0 
        ? (conversionStats.convertedSessions / conversionStats.sessionsWithCart) * 100 
        : 0;

      const abandonmentRate = conversionStats.sessionsWithCart > 0 
        ? (conversionStats.abandonedSessions / conversionStats.sessionsWithCart) * 100 
        : 0;

      return {
        activitySummary,
        recentActivities,
        cartAbandonments,
        topActiveCustomers,
        cartConversionStats: {
          ...conversionStats,
          conversionRate,
          abandonmentRate
        },
        cartActivityBreakdown,
        popularCartItems,
        hourlyPattern,
        dateRange: fromDate && toDate ? 'custom' : dateRange,
        customDateRange: fromDate && toDate ? { fromDate, toDate } : null,
        totalActivities: recentActivities.length,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      throw error;
    }
  }

  // Get real-time active sessions
  static async getActiveSessions() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const activeSessions = await CustomerActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: fiveMinutesAgo },
            activityType: { $ne: 'logout' }
          }
        },
        {
          $group: {
            _id: {
              customer: '$customer',
              sessionId: '$sessionId'
            },
            lastActivity: { $max: '$timestamp' },
            activityCount: { $sum: 1 },
            cartItems: {
              $sum: {
                $cond: [
                  { $in: ['$activityType', ['cart_add', 'cart_update']] },
                  '$details.cartItemCount',
                  0
                ]
              }
            },
            cartTotal: { $last: '$details.cartTotal' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.customer',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        { $sort: { lastActivity: -1 } }
      ]);

      return activeSessions;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }
}

module.exports = CustomerActivityService;