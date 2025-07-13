const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const CustomerActivityService = require('../services/customerActivityService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token with extended expiration for better UX
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};



// Customer login with mobile and name (no password required)
router.post('/customer-login', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number'),
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { mobile, name } = req.body;

    // Find user by mobile number
    let user = await User.findOne({ phone: mobile, role: 'customer' });
    
    if (user) {
      // User exists, check if name matches (case-insensitive)
      if (user.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        // Name matches, proceed with login
        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);
        
        // Track login activity
        try {
          const sessionId = `session_${user._id}_${Date.now()}`;
          await CustomerActivityService.trackLogin(user._id, sessionId, {
            loginMethod: 'mobile',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            metadata: { mobile, loginTime: new Date() }
          });
        } catch (activityError) {
          console.error('Error tracking login activity:', activityError);
          // Don't fail login if activity tracking fails
        }

        return res.json({
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
          }
        });
      } else {
        // Name doesn't match
        return res.status(401).json({ 
          message: 'Name does not match our records for this mobile number' 
        });
      }
    } else {
      // User doesn't exist, create new customer account
      try {
        const newUser = new User({
          name: name.trim(),
          phone: mobile,
          role: 'customer',
          password: 'auto-generated-' + Date.now(), // Temporary password, not used for customer login
          isActive: true
        });

        await newUser.save();

        const token = generateToken(newUser._id);
        
        // Track login activity for new user
        try {
          const sessionId = `session_${newUser._id}_${Date.now()}`;
          await CustomerActivityService.trackLogin(newUser._id, sessionId, {
            loginMethod: 'mobile',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            metadata: { mobile, loginTime: new Date(), isNewUser: true }
          });
        } catch (activityError) {
          console.error('Error tracking new user login activity:', activityError);
          // Don't fail login if activity tracking fails
        }

        return res.status(201).json({
          message: 'Account created and login successful',
          token,
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role
          }
        });
      } catch (createError) {
        console.error('Error creating new customer:', createError);
        return res.status(500).json({ 
          message: 'Failed to create customer account' 
        });
      }
    }
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Login user (for employees, admin, delivery)
router.post('/login', [
  body('identifier').notEmpty().withMessage('Email or mobile number required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { identifier, password } = req.body;

    // Find user by email or phone
    let user;
    if (/^[6-9]\d{9}$/.test(identifier)) {
      // It's a mobile number
      user = await User.findOne({ phone: identifier, role: 'customer' });
    } else {
      // It's an email
      user = await User.findOne({ email: identifier.toLowerCase() });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);
    
    // Track login activity (only for customers)
    if (user.role === 'customer') {
      try {
        const sessionId = `session_${user._id}_${Date.now()}`;
        await CustomerActivityService.trackLogin(user._id, sessionId, {
          loginMethod: 'email',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          metadata: { identifier, loginTime: new Date() }
        });
      } catch (activityError) {
        console.error('Error tracking login activity:', activityError);
        // Don't fail login if activity tracking fails
      }
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number'),
  body('address.street').optional().trim().isLength({ max: 100 }),
  body('address.city').optional().trim().isLength({ max: 50 }),
  body('address.state').optional().trim().isLength({ max: 50 }),
  body('address.zipCode').optional().trim().isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, phone, address, preferences } = req.body;
    const user = req.user;

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // If we reach here, the token is valid (middleware passed)
    res.json({ 
      valid: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, message: 'Token verification failed' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // If we reach here, the current token is still valid
    // Generate a new token with extended expiration
    const newToken = generateToken(req.user._id);
    
    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Token refresh failed' });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more advanced setup, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

module.exports = router;