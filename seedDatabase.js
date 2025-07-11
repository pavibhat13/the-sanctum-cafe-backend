const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const User = require('./models/User');
const Inventory = require('./models/Inventory');
const Settings = require('./models/Settings');
const { seedDefaultSettings } = require('./seeders/defaultSettings');
require('dotenv').config();

// Sample menu items data
const menuItems = [
  {
    name: 'Espresso',
    description: 'Rich and bold espresso shot made from premium coffee beans',
    price: 2.50,
    category: 'beverage',
    image: '/images/espresso.jpg',
    isAvailable: true,
    preparationTime: 3,
    ingredients: ['Premium espresso beans', 'Filtered water'],
    allergens: [],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 5,
      protein: 0.1,
      carbs: 0.8,
      fat: 0.2,
      caffeine: '63mg'
    }
  },
  {
    name: 'Cappuccino',
    description: 'Perfect balance of espresso, steamed milk, and velvety foam',
    price: 4.25,
    category: 'beverage',
    image: '/images/cappuccino.jpg',
    isAvailable: true,
    preparationTime: 5,
    ingredients: ['Espresso beans', 'Fresh milk', 'Milk foam'],
    allergens: ['dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 120,
      protein: 6,
      carbs: 12,
      fat: 4,
      caffeine: '63mg'
    }
  },
  {
    name: 'Latte',
    description: 'Smooth espresso with steamed milk and light foam',
    price: 4.75,
    category: 'beverage',
    image: '/images/latte.jpg',
    isAvailable: true,
    preparationTime: 5,
    ingredients: ['Espresso beans', 'Steamed milk'],
    allergens: ['dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 150,
      protein: 8,
      carbs: 15,
      fat: 6,
      caffeine: '63mg'
    }
  },
  {
    name: 'Americano',
    description: 'Classic espresso diluted with hot water for a smooth taste',
    price: 3.25,
    category: 'beverage',
    image: '/images/americano.jpg',
    isAvailable: true,
    preparationTime: 3,
    ingredients: ['Espresso beans', 'Hot water'],
    allergens: [],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 10,
      protein: 0.3,
      carbs: 1.7,
      fat: 0.2,
      caffeine: '63mg'
    }
  },
  {
    name: 'Mocha',
    description: 'Decadent blend of espresso, chocolate, and steamed milk',
    price: 5.25,
    category: 'beverage',
    image: '/images/mocha.jpg',
    isAvailable: true,
    preparationTime: 6,
    ingredients: ['Espresso beans', 'Milk', 'Chocolate syrup', 'Whipped cream'],
    allergens: ['dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 290,
      protein: 10,
      carbs: 35,
      fat: 12,
      caffeine: '95mg'
    }
  },
  {
    name: 'Croissant',
    description: 'Buttery, flaky French pastry baked fresh daily',
    price: 3.50,
    category: 'appetizer',
    image: '/images/croissant.jpg',
    isAvailable: true,
    preparationTime: 2,
    ingredients: ['Flour', 'Butter', 'Yeast', 'Salt', 'Sugar'],
    allergens: ['gluten', 'dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 231,
      protein: 5,
      carbs: 26,
      fat: 12,
      caffeine: '0mg'
    }
  },
  {
    name: 'Blueberry Muffin',
    description: 'Fresh baked muffin bursting with juicy blueberries',
    price: 4.00,
    category: 'dessert',
    image: '/images/blueberry-muffin.jpg',
    isAvailable: true,
    preparationTime: 2,
    ingredients: ['Flour', 'Fresh blueberries', 'Sugar', 'Eggs', 'Butter'],
    allergens: ['gluten', 'eggs', 'dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 265,
      protein: 4,
      carbs: 47,
      fat: 7,
      caffeine: '0mg'
    }
  },
  {
    name: 'Avocado Toast',
    description: 'Toasted artisan sourdough topped with fresh avocado and seasonings',
    price: 7.50,
    category: 'main-course',
    image: '/images/avocado-toast.jpg',
    isAvailable: true,
    preparationTime: 8,
    ingredients: ['Sourdough bread', 'Fresh avocado', 'Sea salt', 'Black pepper', 'Lime'],
    allergens: ['gluten'],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 320,
      protein: 8,
      carbs: 35,
      fat: 18,
      caffeine: '0mg'
    }
  },
  {
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with caesar dressing, croutons, and parmesan',
    price: 9.25,
    category: 'main-course',
    image: '/images/caesar-salad.jpg',
    isAvailable: true,
    preparationTime: 10,
    ingredients: ['Romaine lettuce', 'Caesar dressing', 'Croutons', 'Parmesan cheese'],
    allergens: ['dairy', 'gluten'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 285,
      protein: 12,
      carbs: 18,
      fat: 20,
      caffeine: '0mg'
    }
  },
  {
    name: 'Green Tea',
    description: 'Premium organic green tea with delicate flavor and antioxidants',
    price: 2.75,
    category: 'beverage',
    image: '/images/green-tea.jpg',
    isAvailable: true,
    preparationTime: 4,
    ingredients: ['Organic green tea leaves', 'Hot water'],
    allergens: [],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 2,
      protein: 0.2,
      carbs: 0.5,
      fat: 0,
      caffeine: '25mg'
    }
  },
  {
    name: 'Chai Latte',
    description: 'Aromatic spiced tea blend with steamed milk and warming spices',
    price: 4.50,
    category: 'beverage',
    image: '/images/chai-latte.jpg',
    isAvailable: true,
    preparationTime: 5,
    ingredients: ['Chai tea blend', 'Milk', 'Cinnamon', 'Cardamom', 'Ginger'],
    allergens: ['dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    nutritionalInfo: {
      calories: 180,
      protein: 7,
      carbs: 25,
      fat: 6,
      caffeine: '40mg'
    }
  },
  {
    name: 'Chocolate Chip Cookie',
    description: 'Freshly baked chocolate chip cookie with premium chocolate',
    price: 2.25,
    category: 'dessert',
    image: '/images/chocolate-chip-cookie.jpg',
    isAvailable: true,
    preparationTime: 1,
    ingredients: ['Flour', 'Chocolate chips', 'Butter', 'Brown sugar', 'Vanilla'],
    allergens: ['gluten', 'dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 160,
      protein: 2,
      carbs: 22,
      fat: 8,
      caffeine: '5mg'
    }
  },
  {
    name: 'Grilled Chicken Sandwich',
    description: 'Tender grilled chicken breast with fresh vegetables on artisan bread',
    price: 12.50,
    category: 'main-course',
    image: '/images/chicken-sandwich.jpg',
    isAvailable: true,
    preparationTime: 12,
    ingredients: ['Grilled chicken breast', 'Artisan bread', 'Lettuce', 'Tomato', 'Mayo'],
    allergens: ['gluten'],
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 450,
      protein: 35,
      carbs: 38,
      fat: 18,
      caffeine: '0mg'
    }
  },
  {
    name: 'Vegetarian Wrap',
    description: 'Fresh vegetables and hummus wrapped in a soft tortilla',
    price: 8.75,
    category: 'main-course',
    image: '/images/veggie-wrap.jpg',
    isAvailable: true,
    preparationTime: 8,
    ingredients: ['Tortilla', 'Hummus', 'Cucumber', 'Tomato', 'Spinach', 'Red onion'],
    allergens: ['gluten'],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 320,
      protein: 12,
      carbs: 45,
      fat: 12,
      caffeine: '0mg'
    }
  },
  {
    name: 'Cheesecake Slice',
    description: 'Rich and creamy New York style cheesecake with berry compote',
    price: 6.50,
    category: 'dessert',
    image: '/images/cheesecake.jpg',
    isAvailable: true,
    preparationTime: 3,
    ingredients: ['Cream cheese', 'Graham cracker crust', 'Sugar', 'Eggs', 'Berry compote'],
    allergens: ['dairy', 'gluten', 'eggs'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    nutritionalInfo: {
      calories: 380,
      protein: 8,
      carbs: 35,
      fat: 24,
      caffeine: '0mg'
    }
  }
];

// Sample users data for different roles
const sampleUsers = [
  // Admin users
  {
    name: 'Admin User',
    email: 'admin@sanctumcafe.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1-555-0101',
    address: {
      street: '123 Admin St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: true
    }
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.admin@sanctumcafe.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1-555-0102',
    address: {
      street: '456 Management Ave',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90211',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: false
    }
  },

  // Employee users
  {
    name: 'Mike Chen',
    email: 'mike.chen@sanctumcafe.com',
    password: 'employee123',
    role: 'employee',
    department: 'Kitchen',
    phone: '+1-555-0201',
    address: {
      street: '789 Worker Blvd',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90212',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: false
    }
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@sanctumcafe.com',
    password: 'employee123',
    role: 'employee',
    department: 'Kitchen',
    phone: '+1-555-0202',
    address: {
      street: '321 Staff St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90213',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: true
    }
  },
  {
    name: 'David Kim',
    email: 'david.kim@sanctumcafe.com',
    password: 'employee123',
    role: 'employee',
    department: 'Kitchen',
    phone: '+1-555-0203',
    address: {
      street: '654 Team Ave',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90214',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: false,
      newsletter: false
    }
  },
  {
    name: 'Lisa Wang',
    email: 'lisa.wang@sanctumcafe.com',
    password: 'employee123',
    role: 'employee',
    department: 'Management',
    phone: '+1-555-0204',
    address: {
      street: '987 Crew Rd',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90215',
      country: 'USA'
    },
    isActive: false, // Inactive employee for testing
    preferences: {
      notifications: true,
      newsletter: false
    }
  },

  // Delivery personnel
  {
    name: 'Carlos Martinez',
    email: 'carlos.martinez@sanctumcafe.com',
    password: 'delivery123',
    role: 'delivery',
    department: 'Delivery',
    phone: '+1-555-0301',
    address: {
      street: '147 Delivery Dr',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90216',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: false
    }
  },
  {
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@sanctumcafe.com',
    password: 'delivery123',
    role: 'delivery',
    department: 'Delivery',
    phone: '+1-555-0302',
    address: {
      street: '258 Route St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90217',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: true
    }
  },
  {
    name: 'Maria Gonzalez',
    email: 'maria.gonzalez@sanctumcafe.com',
    password: 'delivery123',
    role: 'delivery',
    department: 'Delivery',
    phone: '+1-555-0303',
    address: {
      street: '369 Transport Ave',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90218',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: false,
      newsletter: false
    }
  },

  // Customer users
  {
    name: 'John Smith',
    email: 'john.smith@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543210',
    address: {
      street: '123 Main St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90220',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: true
    }
  },
  {
    name: 'Jennifer Davis',
    email: 'jennifer.davis@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543211',
    address: {
      street: '456 Oak Ave',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90221',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: false
    }
  },
  {
    name: 'Robert Wilson',
    email: 'robert.wilson@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543212',
    address: {
      street: '789 Pine St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90222',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: false,
      newsletter: true
    }
  },
  {
    name: 'Michelle Brown',
    email: 'michelle.brown@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543213',
    address: {
      street: '321 Elm Dr',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90223',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: true
    }
  },
  {
    name: 'Christopher Lee',
    email: 'christopher.lee@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543214',
    address: {
      street: '654 Maple Ave',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90224',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: false,
      newsletter: false
    }
  },
  {
    name: 'Amanda Taylor',
    email: 'amanda.taylor@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543215',
    address: {
      street: '987 Cedar St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90225',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: false
    }
  },
  {
    name: 'Daniel Anderson',
    email: 'daniel.anderson@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543216',
    address: {
      street: '147 Birch Rd',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90226',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: true
    }
  },
  {
    name: 'Jessica Martinez',
    email: 'jessica.martinez@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543217',
    address: {
      street: '258 Willow Ave',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90227',
      country: 'USA'
    },
    isActive: false, // Inactive customer for testing
    preferences: {
      notifications: false,
      newsletter: false
    }
  },
  {
    name: 'Kevin Thompson',
    email: 'kevin.thompson@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543218',
    address: {
      street: '369 Spruce St',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90228',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: true,
      newsletter: false
    }
  },
  {
    name: 'Rachel Garcia',
    email: 'rachel.garcia@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '9876543219',
    address: {
      street: '741 Poplar Dr',
      city: 'Coffee City',
      state: 'CA',
      zipCode: '90229',
      country: 'USA'
    },
    isActive: true,
    preferences: {
      notifications: false,
      newsletter: true
    }
  }
];

// Sample inventory data
const inventoryItems = [
  // Coffee & Beverages
  {
    name: 'Premium Espresso Beans',
    category: 'ingredients',
    currentStock: 25,
    minStock: 10,
    maxStock: 50,
    unit: 'kg',
    costPerUnit: 18.50,
    supplier: 'Coffee Roasters Inc.',
    supplierContact: {
      phone: '+1-555-2001',
      email: 'orders@coffeeroasters.com',
      address: '123 Bean St, Coffee City, CA'
    },
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    notes: 'Premium single-origin beans from Colombia'
  },
  {
    name: 'Whole Milk',
    category: 'dairy',
    currentStock: 12,
    minStock: 15,
    maxStock: 30,
    unit: 'L',
    costPerUnit: 3.25,
    supplier: 'Fresh Dairy Co.',
    supplierContact: {
      phone: '+1-555-2002',
      email: 'orders@freshdairy.com'
    },
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    notes: 'Organic whole milk, delivered daily'
  },
  {
    name: 'Oat Milk',
    category: 'dairy',
    currentStock: 8,
    minStock: 10,
    maxStock: 25,
    unit: 'L',
    costPerUnit: 4.75,
    supplier: 'Plant Based Foods Ltd.',
    supplierContact: {
      phone: '+1-555-2003',
      email: 'supply@plantbased.com'
    },
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    notes: 'Barista-grade oat milk for coffee drinks'
  },
  {
    name: 'Green Tea Leaves',
    category: 'ingredients',
    currentStock: 3,
    minStock: 5,
    maxStock: 15,
    unit: 'kg',
    costPerUnit: 22.00,
    supplier: 'Tea Masters Co.',
    supplierContact: {
      phone: '+1-555-2004',
      email: 'orders@teamasters.com'
    },
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    notes: 'Organic green tea from Japan'
  },
  {
    name: 'Chai Tea Blend',
    category: 'ingredients',
    currentStock: 6,
    minStock: 8,
    maxStock: 20,
    unit: 'kg',
    costPerUnit: 15.75,
    supplier: 'Spice Route Trading',
    supplierContact: {
      phone: '+1-555-2005',
      email: 'orders@spiceroute.com'
    },
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    notes: 'Traditional Indian chai spice blend'
  },

  // Baking & Food Ingredients
  {
    name: 'All-Purpose Flour',
    category: 'grains',
    currentStock: 45,
    minStock: 20,
    maxStock: 100,
    unit: 'kg',
    costPerUnit: 2.85,
    supplier: 'Grain Mills Co.',
    supplierContact: {
      phone: '+1-555-2006',
      email: 'orders@grainmills.com'
    },
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months from now
    notes: 'Unbleached all-purpose flour for baking'
  },
  {
    name: 'Fresh Eggs',
    category: 'dairy',
    currentStock: 24,
    minStock: 30,
    maxStock: 60,
    unit: 'dozen',
    costPerUnit: 4.50,
    supplier: 'Farm Fresh Eggs',
    supplierContact: {
      phone: '+1-555-2007',
      email: 'orders@farmfresh.com'
    },
    expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    notes: 'Free-range eggs from local farms'
  },
  {
    name: 'Unsalted Butter',
    category: 'dairy',
    currentStock: 8,
    minStock: 12,
    maxStock: 25,
    unit: 'kg',
    costPerUnit: 7.25,
    supplier: 'Creamery Products',
    supplierContact: {
      phone: '+1-555-2008',
      email: 'orders@creamery.com'
    },
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
    notes: 'Premium unsalted butter for baking'
  },
  {
    name: 'Granulated Sugar',
    category: 'ingredients',
    currentStock: 35,
    minStock: 25,
    maxStock: 75,
    unit: 'kg',
    costPerUnit: 1.95,
    supplier: 'Sweet Supply Co.',
    supplierContact: {
      phone: '+1-555-2009',
      email: 'orders@sweetsupply.com'
    },
    notes: 'Pure cane sugar for beverages and baking'
  },
  {
    name: 'Dark Chocolate Chips',
    category: 'ingredients',
    currentStock: 12,
    minStock: 8,
    maxStock: 30,
    unit: 'kg',
    costPerUnit: 12.50,
    supplier: 'Chocolate Delights',
    supplierContact: {
      phone: '+1-555-2010',
      email: 'orders@chocolatedelights.com'
    },
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    notes: '70% dark chocolate chips for cookies and desserts'
  },

  // Fresh Produce
  {
    name: 'Fresh Avocados',
    category: 'produce',
    currentStock: 15,
    minStock: 20,
    maxStock: 40,
    unit: 'pieces',
    costPerUnit: 1.25,
    supplier: 'Fresh Produce Market',
    supplierContact: {
      phone: '+1-555-2011',
      email: 'orders@freshproduce.com'
    },
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    notes: 'Hass avocados for avocado toast'
  },
  {
    name: 'Romaine Lettuce',
    category: 'produce',
    currentStock: 8,
    minStock: 12,
    maxStock: 25,
    unit: 'heads',
    costPerUnit: 2.75,
    supplier: 'Green Leaf Farms',
    supplierContact: {
      phone: '+1-555-2012',
      email: 'orders@greenleaf.com'
    },
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    notes: 'Fresh romaine for Caesar salads'
  },
  {
    name: 'Fresh Tomatoes',
    category: 'produce',
    currentStock: 10,
    minStock: 15,
    maxStock: 30,
    unit: 'kg',
    costPerUnit: 4.50,
    supplier: 'Vine Ripe Tomatoes',
    supplierContact: {
      phone: '+1-555-2013',
      email: 'orders@vineripe.com'
    },
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    notes: 'Vine-ripened tomatoes for sandwiches and salads'
  },
  {
    name: 'Fresh Blueberries',
    category: 'produce',
    currentStock: 4,
    minStock: 8,
    maxStock: 20,
    unit: 'kg',
    costPerUnit: 8.75,
    supplier: 'Berry Best Farms',
    supplierContact: {
      phone: '+1-555-2014',
      email: 'orders@berrybest.com'
    },
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    notes: 'Fresh blueberries for muffins and desserts'
  },

  // Meat & Protein
  {
    name: 'Chicken Breast',
    category: 'meat',
    currentStock: 8,
    minStock: 10,
    maxStock: 25,
    unit: 'kg',
    costPerUnit: 12.95,
    supplier: 'Premium Poultry Co.',
    supplierContact: {
      phone: '+1-555-2015',
      email: 'orders@premiumpoultry.com'
    },
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    notes: 'Free-range chicken breast for sandwiches'
  },
  {
    name: 'Hummus',
    category: 'ingredients',
    currentStock: 6,
    minStock: 10,
    maxStock: 20,
    unit: 'kg',
    costPerUnit: 6.25,
    supplier: 'Mediterranean Foods',
    supplierContact: {
      phone: '+1-555-2016',
      email: 'orders@medfoods.com'
    },
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    notes: 'Traditional hummus for wraps and sandwiches'
  },

  // Spices & Seasonings
  {
    name: 'Sea Salt',
    category: 'spices',
    currentStock: 5,
    minStock: 3,
    maxStock: 10,
    unit: 'kg',
    costPerUnit: 8.50,
    supplier: 'Gourmet Spices Ltd.',
    supplierContact: {
      phone: '+1-555-2017',
      email: 'orders@gourmetspices.com'
    },
    notes: 'Coarse sea salt for seasoning'
  },
  {
    name: 'Black Pepper',
    category: 'spices',
    currentStock: 2,
    minStock: 2,
    maxStock: 8,
    unit: 'kg',
    costPerUnit: 15.75,
    supplier: 'Spice World Trading',
    supplierContact: {
      phone: '+1-555-2018',
      email: 'orders@spiceworld.com'
    },
    notes: 'Freshly ground black pepper'
  },
  {
    name: 'Cinnamon Powder',
    category: 'spices',
    currentStock: 3,
    minStock: 2,
    maxStock: 8,
    unit: 'kg',
    costPerUnit: 12.25,
    supplier: 'Aromatic Spices Co.',
    supplierContact: {
      phone: '+1-555-2019',
      email: 'orders@aromaticspices.com'
    },
    notes: 'Ceylon cinnamon for beverages and baking'
  },

  // Packaging & Supplies
  {
    name: 'Paper Coffee Cups (12oz)',
    category: 'packaging',
    currentStock: 500,
    minStock: 1000,
    maxStock: 5000,
    unit: 'pieces',
    costPerUnit: 0.15,
    supplier: 'Eco Packaging Solutions',
    supplierContact: {
      phone: '+1-555-2020',
      email: 'orders@ecopackaging.com'
    },
    notes: 'Biodegradable coffee cups with lids'
  },
  {
    name: 'Paper Napkins',
    category: 'packaging',
    currentStock: 200,
    minStock: 500,
    maxStock: 2000,
    unit: 'packs',
    costPerUnit: 2.25,
    supplier: 'Restaurant Supply Co.',
    supplierContact: {
      phone: '+1-555-2021',
      email: 'orders@restaurantsupply.com'
    },
    notes: 'Recycled paper napkins for dining area'
  },
  {
    name: 'Food Storage Containers',
    category: 'packaging',
    currentStock: 25,
    minStock: 50,
    maxStock: 150,
    unit: 'pieces',
    costPerUnit: 3.75,
    supplier: 'Kitchen Essentials',
    supplierContact: {
      phone: '+1-555-2022',
      email: 'orders@kitchenessentials.com'
    },
    notes: 'BPA-free containers for food storage'
  },

  // Cleaning Supplies
  {
    name: 'All-Purpose Cleaner',
    category: 'cleaning',
    currentStock: 8,
    minStock: 12,
    maxStock: 30,
    unit: 'L',
    costPerUnit: 4.95,
    supplier: 'Clean Solutions Inc.',
    supplierContact: {
      phone: '+1-555-2023',
      email: 'orders@cleansolutions.com'
    },
    notes: 'Food-safe all-purpose cleaner'
  },
  {
    name: 'Dish Soap',
    category: 'cleaning',
    currentStock: 6,
    minStock: 10,
    maxStock: 25,
    unit: 'L',
    costPerUnit: 3.25,
    supplier: 'Kitchen Clean Co.',
    supplierContact: {
      phone: '+1-555-2024',
      email: 'orders@kitchenclean.com'
    },
    notes: 'Concentrated dish soap for kitchen use'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      MenuItem.deleteMany({}),
      Order.deleteMany({}),
      User.deleteMany({}),
      Inventory.deleteMany({}),
      Settings.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Seed default settings
    await seedDefaultSettings();

    // Insert users one by one to trigger password hashing
    console.log('Inserting users...');
    const insertedUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      insertedUsers.push(user);
    }
    console.log(`Inserted ${insertedUsers.length} users`);

    // Insert menu items
    const insertedItems = await MenuItem.insertMany(menuItems);
    console.log(`Inserted ${insertedItems.length} menu items`);

    // Insert inventory items
    const insertedInventory = await Inventory.insertMany(inventoryItems);
    console.log(`Inserted ${insertedInventory.length} inventory items`);

    // Get customers for creating orders
    const customers = insertedUsers.filter(user => user.role === 'customer');
    const employees = insertedUsers.filter(user => user.role === 'employee');
    const deliveryPersons = insertedUsers.filter(user => user.role === 'delivery');

    // Create comprehensive sample orders
    const sampleOrders = [];
    const orderStatuses = ['pending', 'order placed', 'cooking in progress', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled'];
    const orderTypes = ['dine in', 'take away', 'delivery'];
    const paymentMethods = ['cash', 'card', 'digital-wallet'];
    const specialInstructions = [
      'Extra hot please',
      'No foam',
      'Extra shot',
      'Oat milk instead of regular',
      'Light on the sugar',
      'Extra crispy',
      'Well done',
      'On the side',
      'No onions',
      'Extra sauce'
    ];

    // Create orders for the last 30 days with realistic distribution
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < 150; i++) { // More orders for better analytics
      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
      const randomItems = [];
      const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per order

      for (let j = 0; j < numItems; j++) {
        const randomMenuItem = insertedItems[Math.floor(Math.random() * insertedItems.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity

        randomItems.push({
          menuItem: randomMenuItem._id,
          quantity: quantity,
          price: randomMenuItem.price,
          specialInstructions: Math.random() > 0.6 ?
            specialInstructions[Math.floor(Math.random() * specialInstructions.length)] :
            undefined
        });
      }

      const subtotal = randomItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.0875; // 8.75% tax
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      // const deliveryFee = orderType === 'delivery' ? (Math.random() > 0.5 ? 3.99 : 5.99) : 0; // Commented out - delivery is now free
      const deliveryFee = 0; // Delivery is now free
      const tip = Math.random() > 0.3 ? Math.round((subtotal * (0.1 + Math.random() * 0.1)) * 100) / 100 : 0;
      const total = subtotal + deliveryFee + tip;

      // Create realistic order date distribution (more recent orders)
      const daysAgo = Math.floor(Math.random() * Math.random() * 30); // Weighted towards recent
      const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Add some time variation within the day
      orderDate.setHours(
        Math.floor(Math.random() * 14) + 6, // 6 AM to 8 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      // Status distribution - more delivered orders for older orders
      let status;
      if (daysAgo > 1) {
        status = Math.random() > 0.1 ? 'delivered' : 'cancelled';
      } else if (daysAgo > 0) {
        const statusOptions = ['delivered', 'cancelled', 'ready for pickup', 'cooking in progress'];
        status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      } else {
        // Today's orders - more variety in status
        status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      }

      const order = {
        orderNumber: `ORD-${String(i + 1).padStart(4, '0')}`,
        customer: randomCustomer._id,
        items: randomItems,
        orderType: orderType,
        tableNumber: orderType === 'dine in' ? Math.floor(Math.random() * 25) + 1 : undefined,
        deliveryAddress: orderType === 'delivery' ? {
          street: randomCustomer.address.street,
          city: randomCustomer.address.city,
          state: randomCustomer.address.state,
          zipCode: randomCustomer.address.zipCode,
          instructions: Math.random() > 0.7 ? 'Ring doorbell' : undefined
        } : undefined,
        assignedTo: (orderType === 'delivery' && deliveryPersons.length > 0) ?
          deliveryPersons[Math.floor(Math.random() * deliveryPersons.length)]._id :
          (employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)]._id : undefined),
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: status,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        deliveryFee: deliveryFee,
        tip: tip,
        total: Math.round(total * 100) / 100,
        createdAt: orderDate,
        updatedAt: status === 'delivered' ?
          new Date(orderDate.getTime() + Math.random() * 2 * 60 * 60 * 1000) : // Delivered within 2 hours
          orderDate,
        estimatedDeliveryTime: orderType === 'delivery' ?
          new Date(orderDate.getTime() + (30 + Math.random() * 30) * 60 * 1000) : // 30-60 min
          new Date(orderDate.getTime() + (10 + Math.random() * 20) * 60 * 1000), // 10-30 min
        notes: Math.random() > 0.8 ? 'Customer called to confirm address' : undefined
      };

      sampleOrders.push(order);
    }

    // Insert orders
    const insertedOrders = await Order.insertMany(sampleOrders);
    console.log(`Inserted ${insertedOrders.length} sample orders`);

    console.log('Database seeding completed successfully!');

    // Display comprehensive summary
    const menuCount = await MenuItem.countDocuments();
    const orderCount = await Order.countDocuments();
    const userCount = await User.countDocuments();
    const inventoryCount = await Inventory.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const employeeCount = await User.countDocuments({ role: 'employee' });
    const deliveryCount = await User.countDocuments({ role: 'delivery' });
    const customerCount = await User.countDocuments({ role: 'customer' });
    const activeUserCount = await User.countDocuments({ isActive: true });

    // Order statistics
    const pendingOrderCount = await Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing'] } });
    const deliveredOrderCount = await Order.countDocuments({ status: 'delivered' });
    const todayOrderCount = await Order.countDocuments({
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
    });

    // Revenue calculation
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Inventory statistics
    const lowStockCount = await Inventory.countDocuments({
      $expr: { $lte: [{ $divide: ['$currentStock', '$minStock'] }, 1] }
    });
    const criticalStockCount = await Inventory.countDocuments({
      $expr: { $lte: [{ $divide: ['$currentStock', '$minStock'] }, 0.5] }
    });

    console.log('\n=== DATABASE SUMMARY ===');
    console.log(`Menu Items: ${menuCount}`);
    console.log(`Inventory Items: ${inventoryCount}`);
    console.log(`  - Low Stock: ${lowStockCount}`);
    console.log(`  - Critical Stock: ${criticalStockCount}`);
    console.log(`Total Orders: ${orderCount}`);
    console.log(`  - Pending/Active: ${pendingOrderCount}`);
    console.log(`  - Delivered: ${deliveredOrderCount}`);
    console.log(`  - Today: ${todayOrderCount}`);
    console.log(`Total Users: ${userCount}`);
    console.log(`  - Admins: ${adminCount}`);
    console.log(`  - Employees: ${employeeCount}`);
    console.log(`  - Delivery: ${deliveryCount}`);
    console.log(`  - Customers: ${customerCount}`);
    console.log(`  - Active Users: ${activeUserCount}`);
    console.log(`Total Revenue: $${totalRevenue[0]?.total?.toFixed(2) || '0.00'}`);
    console.log('========================\n');

    console.log('Sample login credentials:');
    console.log('Admin: admin@sanctumcafe.com / admin123');
    console.log('Employee: mike.chen@sanctumcafe.com / employee123');
    console.log('Delivery: carlos.martinez@sanctumcafe.com / delivery123');
    console.log('Customer: john.smith@email.com / customer123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeder
seedDatabase();