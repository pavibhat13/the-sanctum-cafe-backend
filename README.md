# Sanctum Cafe Backend API

A comprehensive REST API for the Sanctum Cafe Management System built with Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   ```

4. **Configure Environment Variables**
   Edit `.env` file with your settings:
   ```env
   # Database - Choose one:
   MONGODB_URI=mongodb://localhost:27017/sanctum-cafe
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sanctum-cafe
   
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Seed sample data (optional)**
   ```bash
   node seeders/sampleData.js
   ```

## 📊 Database Setup Options

### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use: `MONGODB_URI=mongodb://localhost:27017/sanctum-cafe`

### Option 2: MongoDB Atlas (Recommended for beginners)
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Get connection string and replace in `.env`
4. Whitelist your IP address in Atlas dashboard

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in requests:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Sample Login Credentials (after seeding)
- **Admin**: admin@sanctumcafe.com / admin123
- **Employee**: employee@sanctumcafe.com / employee123
- **Customer**: customer@example.com / customer123
- **Delivery**: delivery@sanctumcafe.com / delivery123

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /login` - User login
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `POST /logout` - Logout user

### Menu Routes (`/api/menu`)
- `GET /` - Get all menu items (with filtering)
- `GET /:id` - Get single menu item
- `POST /` - Create menu item (employee/admin)
- `PUT /:id` - Update menu item (employee/admin)
- `DELETE /:id` - Delete menu item (employee/admin)
- `PATCH /:id/availability` - Toggle availability (employee/admin)
- `GET /categories/list` - Get all categories

### Order Routes (`/api/orders`)
- `GET /my-orders` - Get user's orders
- `POST /` - Create new order
- `GET /:id` - Get single order
- `PATCH /:id/status` - Update order status (employee/admin)
- `GET /` - Get all orders (employee/admin)

### User Management (`/api/users`) - Admin only
- `GET /` - Get all users
- `GET /:id` - Get single user
- `PATCH /:id/role` - Update user role
- `PATCH /:id/status` - Toggle user active status

### Admin Dashboard (`/api/admin`) - Admin only
- `GET /dashboard` - Get dashboard statistics
- `GET /recent-orders` - Get recent orders
- `GET /analytics/sales` - Get sales analytics
- `GET /analytics/order-status` - Get order status distribution

## 🛡️ Security Features

- **Helmet**: Security headers
- **Rate Limiting**: Prevents abuse
- **CORS**: Cross-origin resource sharing
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: express-validator
- **Role-based Access Control**: Different permissions for different roles

## 🏗️ Project Structure

```
backend/
├── models/           # Database models
│   ├── User.js
│   ├── MenuItem.js
│   └── Order.js
├── routes/           # API routes
│   ├── auth.js
│   ├── menu.js
│   ├── orders.js
│   ├── users.js
│   └── admin.js
├── middleware/       # Custom middleware
│   └── auth.js
├── seeders/          # Database seeders
│   └── sampleData.js
├── .env.example      # Environment variables template
├── server.js         # Main server file
└── package.json      # Dependencies and scripts
```

## 🚀 Deployment Options

### 1. Railway (Recommended - $5/month)
1. Push code to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy automatically

### 2. Render (Free tier available)
1. Connect GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### 3. Heroku
1. Install Heroku CLI
2. Create Heroku app
3. Set environment variables
4. Deploy with Git

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (when implemented)

### Adding New Features
1. Create model in `models/` if needed
2. Add routes in `routes/`
3. Add middleware if needed
4. Update this README

## 📈 Monitoring & Logs

The API includes:
- Health check endpoint: `GET /api/health`
- Console logging for errors
- Request/response logging in development

## 🤝 API Usage Examples



### Login
```javascript
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Menu Items
```javascript
GET /api/menu?category=main-course&isVegetarian=true&page=1&limit=10
```

### Create Order
```javascript
POST /api/orders
{
  "items": [
    {
      "menuItem": "menu_item_id",
      "quantity": 2,
      "specialInstructions": "No onions"
    }
  ],
  "orderType": "dine-in",
  "tableNumber": 5,
  "paymentMethod": "card"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity for Atlas

2. **JWT Token Errors**
   - Ensure JWT_SECRET is set in `.env`
   - Check token format in requests

3. **CORS Errors**
   - Verify FRONTEND_URL in `.env`
   - Check if frontend is running on correct port

4. **Port Already in Use**
   - Change PORT in `.env`
   - Kill process using the port

### Getting Help
- Check server logs for detailed error messages
- Verify all environment variables are set
- Test API endpoints with Postman or similar tool

## 📝 License

MIT License - feel free to use this project for learning and development.