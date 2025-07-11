const Settings = require('../models/Settings');

const defaultSettings = [
  // Business Settings
  {
    category: 'business',
    key: 'name',
    value: 'Sanctum Cafe',
    description: 'Business name'
  },
  {
    category: 'business',
    key: 'address',
    value: '123 Coffee Street, Brew City, BC 12345',
    description: 'Business address'
  },
  {
    category: 'business',
    key: 'phone',
    value: '(555) 123-CAFE',
    description: 'Business phone number'
  },
  {
    category: 'business',
    key: 'email',
    value: 'info@sanctumcafe.com',
    description: 'Business email address'
  },
  {
    category: 'business',
    key: 'website',
    value: 'https://sanctumcafe.com',
    description: 'Business website'
  },
  {
    category: 'business',
    key: 'description',
    value: 'A cozy neighborhood cafe serving premium coffee and fresh food.',
    description: 'Business description'
  },
  {
    category: 'business',
    key: 'openingHours',
    value: {
      monday: { open: '07:00', close: '19:00', closed: false },
      tuesday: { open: '07:00', close: '19:00', closed: false },
      wednesday: { open: '07:00', close: '19:00', closed: false },
      thursday: { open: '07:00', close: '19:00', closed: false },
      friday: { open: '07:00', close: '20:00', closed: false },
      saturday: { open: '08:00', close: '20:00', closed: false },
      sunday: { open: '08:00', close: '18:00', closed: false }
    },
    description: 'Business opening hours'
  },
  
  // Delivery Settings
  {
    category: 'delivery',
    key: 'enabled',
    value: true,
    description: 'Enable delivery service'
  },
  // Commented out - delivery is now always free
  // {
  //   category: 'delivery',
  //   key: 'freeDeliveryThreshold',
  //   value: 25.00,
  //   description: 'Minimum order amount for free delivery'
  // },
  // Commented out - delivery is now free
  // {
  //   category: 'delivery',
  //   key: 'deliveryFee',
  //   value: 3.99,
  //   description: 'Standard delivery fee'
  // },
  {
    category: 'delivery',
    key: 'maxDeliveryDistance',
    value: 10,
    description: 'Maximum delivery distance in miles'
  },
  {
    category: 'delivery',
    key: 'estimatedDeliveryTime',
    value: 30,
    description: 'Estimated delivery time in minutes'
  },
  
  // Payment Settings
  {
    category: 'payment',
    key: 'acceptCash',
    value: true,
    description: 'Accept cash payments'
  },
  {
    category: 'payment',
    key: 'acceptCard',
    value: true,
    description: 'Accept card payments'
  },
  {
    category: 'payment',
    key: 'acceptDigitalWallet',
    value: true,
    description: 'Accept digital wallet payments'
  },
  {
    category: 'payment',
    key: 'taxRate',
    value: 8.5,
    description: 'Tax rate percentage'
  },
  {
    category: 'payment',
    key: 'tipSuggestions',
    value: [15, 18, 20, 25],
    description: 'Suggested tip percentages'
  },
  
  // Notification Settings
  {
    category: 'notifications',
    key: 'emailNotifications',
    value: true,
    description: 'Enable email notifications'
  },
  {
    category: 'notifications',
    key: 'smsNotifications',
    value: false,
    description: 'Enable SMS notifications'
  },
  {
    category: 'notifications',
    key: 'pushNotifications',
    value: true,
    description: 'Enable push notifications'
  },
  {
    category: 'notifications',
    key: 'orderNotifications',
    value: true,
    description: 'Enable order notifications'
  },
  {
    category: 'notifications',
    key: 'inventoryAlerts',
    value: true,
    description: 'Enable inventory alerts'
  },
  {
    category: 'notifications',
    key: 'customerFeedback',
    value: true,
    description: 'Enable customer feedback notifications'
  },
  
  // System Settings
  {
    category: 'system',
    key: 'timezone',
    value: 'Asia/Kolkata',
    description: 'System timezone'
  },
  {
    category: 'system',
    key: 'dateFormat',
    value: 'DD/MM/YYYY',
    description: 'Date format'
  },
  {
    category: 'system',
    key: 'currency',
    value: 'INR',
    description: 'System currency'
  },
  {
    category: 'system',
    key: 'language',
    value: 'en',
    description: 'System language'
  },
  {
    category: 'system',
    key: 'autoBackup',
    value: true,
    description: 'Enable automatic backups'
  },
  {
    category: 'system',
    key: 'backupFrequency',
    value: 'daily',
    description: 'Backup frequency'
  },
  {
    category: 'system',
    key: 'maintenanceMode',
    value: false,
    description: 'Enable maintenance mode'
  },
  {
    category: 'system',
    key: 'maintenanceMessage',
    value: 'Sorry, we are not delivering currently. Please try again later!',
    description: 'Message to display when maintenance mode is enabled'
  }
];

const seedDefaultSettings = async () => {
  try {
    console.log('🌱 Seeding default settings...');
    
    for (const setting of defaultSettings) {
      await Settings.findOneAndUpdate(
        { category: setting.category, key: setting.key },
        setting,
        { upsert: true, new: true }
      );
    }
    
    console.log('✅ Default settings seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding default settings:', error);
    throw error;
  }
};

module.exports = { seedDefaultSettings, defaultSettings };