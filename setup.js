#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Setting up Sanctum Cafe Backend...\n');

// Generate JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Replace the JWT secret placeholder
    envContent = envContent.replace(
      'your-super-secret-jwt-key-here-make-it-long-and-random',
      jwtSecret
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with generated JWT secret');
  } else {
    console.log('❌ .env.example file not found');
    process.exit(1);
  }
} else {
  console.log('ℹ️  .env file already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Edit .env file with your MongoDB connection string');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev');
console.log('4. Optional: Run: node seeders/sampleData.js (to add sample data)');

console.log('\n🔗 MongoDB Setup Options:');
console.log('• Local: Install MongoDB locally and use: mongodb://localhost:27017/sanctum-cafe');
console.log('• Cloud: Create free MongoDB Atlas account at https://www.mongodb.com/atlas');

console.log('\n🎯 Your generated JWT secret has been added to .env file');
console.log('🔐 Keep this secret secure and never commit it to version control!');

console.log('\n✨ Setup complete! Happy coding! ✨');