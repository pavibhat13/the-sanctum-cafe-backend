const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all settings or settings by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    const settings = await Settings.find(query);
    
    // Transform to nested object structure
    const settingsObj = {};
    settings.forEach(setting => {
      if (!settingsObj[setting.category]) {
        settingsObj[setting.category] = {};
      }
      settingsObj[setting.category][setting.key] = setting.value;
    });
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Get specific setting
router.get('/:category/:key', async (req, res) => {
  try {
    const { category, key } = req.params;
    
    const setting = await Settings.findOne({ category, key });
    
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    res.json({ value: setting.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ message: 'Error fetching setting' });
  }
});

// Update or create settings (Admin only)
router.put('/:category', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const settingsData = req.body;
    
    // Validate category
    const validCategories = ['business', 'delivery', 'payment', 'notifications', 'system'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Update or create each setting
    const updatePromises = Object.entries(settingsData).map(async ([key, value]) => {
      return Settings.findOneAndUpdate(
        { category, key },
        { category, key, value },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({ message: `${category} settings updated successfully` });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Delete setting (Admin only)
router.delete('/:category/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, key } = req.params;
    
    const result = await Settings.findOneAndDelete({ category, key });
    
    if (!result) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ message: 'Error deleting setting' });
  }
});

module.exports = router;