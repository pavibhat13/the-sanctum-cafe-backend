const mongoose = require('mongoose');
const Settings = require('./models/Settings');

mongoose.connect('mongodb://localhost:27017/sanctum-cafe', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  const settings = await Settings.find({});
  console.log('Current settings in database:');
  if (settings.length === 0) {
    console.log('No settings found in database');
  } else {
    settings.forEach(setting => {
      console.log(`Category: ${setting.category}, Key: ${setting.key}, Value: ${JSON.stringify(setting.value)}`);
    });
  }
  mongoose.disconnect();
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});