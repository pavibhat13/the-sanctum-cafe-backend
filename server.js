const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://the-sanctum-cafe.netlify.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Id'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctum-cafe';
console.log('🔗 Connecting to MongoDB:', mongoUri);
mongoose.connect(mongoUri)
.then(() => {
  console.log('✅ Connected to MongoDB');
  console.log('📊 Database name:', mongoose.connection.db.databaseName);
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Load session routes and middleware first
const sessionsRoutes = require('./routes/sessions');

// Add session tracking middleware to all API routes BEFORE defining routes
app.use('/api', sessionsRoutes.trackSession);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/cart-tracking'));
app.use('/api/sessions', sessionsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sanctum Cafe API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const { userRole, userId, sessionId, deviceId } = socket.handshake.query;
  console.log(`👤 Client connected: ${socket.id} (${userRole}:${userId}:${deviceId}:${sessionId})`);
  
  // Store session info on socket
  socket.userRole = userRole;
  socket.userId = userId;
  socket.sessionId = sessionId;
  socket.deviceId = deviceId;
  
  // Join appropriate rooms based on user role and support multiple devices
  if (userRole === 'admin') {
    socket.join('admin'); // All admins
    socket.join(`admin_${userId}`); // Specific admin (all devices)
    socket.join(`admin_${userId}_${deviceId}`); // Specific admin device
    socket.join(`session_${sessionId}`); // Specific session
    console.log(`👨‍💼 Admin joined rooms: ${socket.id} (user:${userId}, device:${deviceId}, session:${sessionId})`);
  } else if (userRole === 'customer') {
    socket.join('customers'); // All customers
    socket.join(`customer_${userId}`); // Specific customer (all devices)
    socket.join(`customer_${userId}_${deviceId}`); // Specific customer device
    socket.join(`session_${sessionId}`); // Specific session
    console.log(`👤 Customer joined rooms: ${socket.id} (user:${userId}, device:${deviceId}, session:${sessionId})`);
  } else if (userRole === 'employee') {
    socket.join('employees');
    socket.join(`employee_${userId}`);
    socket.join(`employee_${userId}_${deviceId}`);
    socket.join(`session_${sessionId}`);
    console.log(`👨‍🍳 Employee joined rooms: ${socket.id} (user:${userId}, device:${deviceId}, session:${sessionId})`);
  } else if (userRole === 'delivery') {
    socket.join('delivery');
    socket.join(`delivery_${userId}`);
    socket.join(`delivery_${userId}_${deviceId}`);
    socket.join(`session_${sessionId}`);
    console.log(`🚚 Delivery joined rooms: ${socket.id} (user:${userId}, device:${deviceId}, session:${sessionId})`);
  }
  
  // Join admin room for real-time analytics (legacy support)
  socket.on('join_admin', () => {
    socket.join('admin');
    console.log('👨‍💼 Admin joined analytics room (legacy):', socket.id);
  });
  
  // Leave admin room (legacy support)
  socket.on('leave_admin', () => {
    socket.leave('admin');
    console.log('👨‍💼 Admin left analytics room (legacy):', socket.id);
  });
  
  // Handle session-specific events
  socket.on('session_ping', (data) => {
    socket.emit('session_pong', { 
      sessionId: socket.sessionId,
      userId: socket.userId,
      deviceId: socket.deviceId,
      userRole: socket.userRole,
      timestamp: Date.now()
    });
  });

  // Handle device-specific events
  socket.on('device_sync', (data) => {
    // Sync data across all devices for the same user
    socket.to(`${userRole}_${userId}`).emit('device_sync_update', {
      fromDevice: deviceId,
      data: data,
      timestamp: Date.now()
    });
  });

  // Handle user-specific notifications
  socket.on('user_notification', (data) => {
    // Send notification to all devices of the user
    io.to(`${userRole}_${userId}`).emit('notification', {
      ...data,
      timestamp: Date.now()
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`👤 Client disconnected: ${socket.id} (${userRole}:${userId}:${deviceId}:${sessionId}) - ${reason}`);
  });
});

// Make io available globally
module.exports.io = io;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server ready for real-time analytics`);
});

module.exports = app;