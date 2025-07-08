const bcrypt = require('bcryptjs');

async function testBcrypt() {
  try {
    console.log('Testing bcrypt functionality...');
    
    const password = 'admin123';
    console.log('Original password:', password);
    
    // Generate salt
    const salt = await bcrypt.genSalt(12);
    console.log('Salt generated:', salt);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed password:', hashedPassword);
    console.log('Hash length:', hashedPassword.length);
    
    // Compare password
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log('Password comparison result:', isValid);
    
    // Test with wrong password
    const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword);
    console.log('Wrong password comparison result:', isInvalid);
    
  } catch (error) {
    console.error('Bcrypt test error:', error);
  }
}

testBcrypt();