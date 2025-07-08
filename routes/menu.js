const express = require('express');
const { body, validationResult, query } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Get all menu items (public route with filtering)
router.get('/', [
  query('category').optional().isIn(['appetizer', 'main-course', 'dessert', 'beverage', 'special']),
  query('isVegetarian').optional().isBoolean(),
  query('isVegan').optional().isBoolean(),
  query('isGlutenFree').optional().isBoolean(),
  query('isAvailable').optional().isBoolean(),
  query('search').optional().trim().isLength({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['name', 'price', 'popularity', 'rating.average', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
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

    const {
      category,
      isVegetarian,
      isVegan,
      isGlutenFree,
      isAvailable = true,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (isVegetarian !== undefined) filter.isVegetarian = isVegetarian === 'true';
    if (isVegan !== undefined) filter.isVegan = isVegan === 'true';
    if (isGlutenFree !== undefined) filter.isGlutenFree = isGlutenFree === 'true';
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .sort(sort)
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
    console.error('Menu fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch menu items' });
  }
});

// Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Menu item fetch error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid menu item ID' });
    }
    res.status(500).json({ message: 'Failed to fetch menu item' });
  }
});

// Create new menu item (employee/admin only)
router.post('/', authenticateToken, requireEmployee, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['appetizer', 'main-course', 'dessert', 'beverage', 'special']).withMessage('Invalid category'),
  body('preparationTime').isInt({ min: 1 }).withMessage('Preparation time must be at least 1 minute'),
  body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
  body('mainIngredients').optional().isArray().withMessage('Main ingredients must be an array'),
  body('mainIngredients.*.name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Main ingredient name is required'),
  body('mainIngredients.*.quantity').optional().isFloat({ min: 0 }).withMessage('Main ingredient quantity must be positive'),
  body('mainIngredients.*.unit').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Main ingredient unit is required'),
  body('allergens').optional().isArray().withMessage('Allergens must be an array'),
  body('spiceLevel').optional().isIn(['mild', 'medium', 'hot', 'extra-hot']).withMessage('Invalid spice level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const menuItem = new MenuItem(req.body);
    await menuItem.save();

    res.status(201).json({
      message: 'Menu item created successfully',
      item: menuItem
    });
  } catch (error) {
    console.error('Menu item creation error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Menu item with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create menu item' });
  }
});

// Update menu item (employee/admin only)
router.put('/:id', authenticateToken, requireEmployee, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().isIn(['appetizer', 'main-course', 'dessert', 'beverage', 'special']).withMessage('Invalid category'),
  body('preparationTime').optional().isInt({ min: 1 }).withMessage('Preparation time must be at least 1 minute'),
  body('mainIngredients').optional().isArray().withMessage('Main ingredients must be an array'),
  body('mainIngredients.*.name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Main ingredient name is required'),
  body('mainIngredients.*.quantity').optional().isFloat({ min: 0 }).withMessage('Main ingredient quantity must be positive'),
  body('mainIngredients.*.unit').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Main ingredient unit is required'),
  body('spiceLevel').optional().isIn(['mild', 'medium', 'hot', 'extra-hot']).withMessage('Invalid spice level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({
      message: 'Menu item updated successfully',
      item
    });
  } catch (error) {
    console.error('Menu item update error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid menu item ID' });
    }
    res.status(500).json({ message: 'Failed to update menu item' });
  }
});

// Delete menu item (employee/admin only)
router.delete('/:id', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Menu item deletion error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid menu item ID' });
    }
    res.status(500).json({ message: 'Failed to delete menu item' });
  }
});

// Toggle menu item availability (employee/admin only)
router.patch('/:id/availability', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    res.json({
      message: `Menu item ${item.isAvailable ? 'enabled' : 'disabled'} successfully`,
      item
    });
  } catch (error) {
    console.error('Menu item availability toggle error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid menu item ID' });
    }
    res.status(500).json({ message: 'Failed to toggle menu item availability' });
  }
});

// Get menu categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category');
    res.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

module.exports = router;