const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// In-memory session store (in production, use Redis or database)
const activeSessions = new Map();

// Middleware to track sessions
const trackSession = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const deviceId = req.header('X-Device-ID');
  const sessionId = req.header('X-Session-ID');
  
  if (token && deviceId && sessionId) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sessionKey = `${decoded.id}_${deviceId}_${sessionId}`;
      
      // Update session activity
      if (activeSessions.has(sessionKey)) {
        const session = activeSessions.get(sessionKey);
        session.lastActivity = new Date();
        session.requestCount = (session.requestCount || 0) + 1;
      } else {
        // Create new session entry
        activeSessions.set(sessionKey, {
          userId: decoded.id,
          userRole: decoded.role,
          deviceId: deviceId,
          sessionId: sessionId,
          createdAt: new Date(),
          lastActivity: new Date(),
          requestCount: 1,
          isActive: true
        });
      }
    } catch (error) {
      console.error('Session tracking error:', error);
    }
  }
  
  next();
};

// Get active sessions for a user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only allow users to see their own sessions or admins to see any
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const userSessions = [];
    for (const [sessionKey, session] of activeSessions.entries()) {
      if (session.userId === userId && session.isActive) {
        userSessions.push({
          sessionId: session.sessionId,
          deviceId: session.deviceId,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          requestCount: session.requestCount,
          isCurrentSession: sessionKey.includes(req.header('X-Session-ID') || '')
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        userId,
        activeSessions: userSessions,
        totalSessions: userSessions.length
      }
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active sessions (admin only)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const allSessions = [];
    for (const [sessionKey, session] of activeSessions.entries()) {
      if (session.isActive) {
        allSessions.push({
          sessionKey,
          userId: session.userId,
          userRole: session.userRole,
          deviceId: session.deviceId,
          sessionId: session.sessionId,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          requestCount: session.requestCount
        });
      }
    }
    
    // Group by user
    const sessionsByUser = {};
    allSessions.forEach(session => {
      if (!sessionsByUser[session.userId]) {
        sessionsByUser[session.userId] = [];
      }
      sessionsByUser[session.userId].push(session);
    });
    
    res.json({
      success: true,
      data: {
        totalActiveSessions: allSessions.length,
        sessionsByUser,
        allSessions
      }
    });
  } catch (error) {
    console.error('Get all sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End a specific session
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    let sessionFound = false;
    for (const [sessionKey, session] of activeSessions.entries()) {
      if (session.sessionId === sessionId && session.userId === userId) {
        session.isActive = false;
        session.endedAt = new Date();
        sessionFound = true;
        
        console.log(`Session ended: ${sessionKey}`);
        break;
      }
    }
    
    if (!sessionFound) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End all sessions for a user
router.delete('/user/:userId/all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only allow users to end their own sessions or admins to end any
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    let endedCount = 0;
    for (const [sessionKey, session] of activeSessions.entries()) {
      if (session.userId === userId && session.isActive) {
        session.isActive = false;
        session.endedAt = new Date();
        endedCount++;
      }
    }
    
    console.log(`Ended ${endedCount} sessions for user ${userId}`);
    
    res.json({
      success: true,
      message: `${endedCount} sessions ended successfully`
    });
  } catch (error) {
    console.error('End all sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let totalActive = 0;
    let activeLastHour = 0;
    let activeLastDay = 0;
    const roleStats = {};
    const deviceStats = {};
    
    for (const [sessionKey, session] of activeSessions.entries()) {
      if (session.isActive) {
        totalActive++;
        
        if (session.lastActivity > oneHourAgo) {
          activeLastHour++;
        }
        
        if (session.lastActivity > oneDayAgo) {
          activeLastDay++;
        }
        
        // Role statistics
        roleStats[session.userRole] = (roleStats[session.userRole] || 0) + 1;
        
        // Device statistics (simplified)
        const deviceType = session.deviceId.includes('mobile') ? 'mobile' : 'desktop';
        deviceStats[deviceType] = (deviceStats[deviceType] || 0) + 1;
      }
    }
    
    res.json({
      success: true,
      data: {
        totalActiveSessions: totalActive,
        activeLastHour,
        activeLastDay,
        roleStats,
        deviceStats,
        timestamp: now
      }
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cleanup old sessions (called periodically)
const cleanupOldSessions = () => {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  let cleanedCount = 0;
  for (const [sessionKey, session] of activeSessions.entries()) {
    const sessionAge = now.getTime() - session.lastActivity.getTime();
    if (sessionAge > maxAge) {
      activeSessions.delete(sessionKey);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} old sessions`);
  }
};

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

// Export the session tracking middleware
router.trackSession = trackSession;

module.exports = router;