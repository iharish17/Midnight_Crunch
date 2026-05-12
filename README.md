# Midnight Crunch

Hostel-only food ordering app with a React/Vite frontend and an Express backend using MongoDB.

## Structure

- `frontend/` - React app with user & admin authentication
- `backend/` - Express API with MongoDB integration
- `MONGODB_SETUP.md` - Complete MongoDB setup guide

## Quick Start

### 1. Setup MongoDB
See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed instructions.

**Recommended: Use MongoDB Atlas (Free Cloud)**
- Go to https://www.mongodb.com/cloud/atlas
- Create free cluster
- Get connection string: `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/midnight_crunch`

### 2. Backend Setup
```bash
cd backend
npm install
```

Create/update `backend/.env`:
```env
PORT=5000
FRONTEND_ORIGIN=http://127.0.0.1:5173
MONGODB_URI=mongodb://localhost:27017
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/midnight_crunch
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create/update `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:5000/api
```

### 4. Run the App
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Visit: http://127.0.0.1:5173

## Features

### Admin Panel (`/admin`)
- Register/Login as admin
- Add, view, and delete food items
- Manage inventory

### User Auth (`/register`, `/login`, `/profile`)
- Register as hosteller
- Login to profile
- Browse available food items

### API Endpoints

**Public:**
- `GET /api/items` - Get all available food items

**Admin (requires Bearer token):**
- `POST /api/admin/register` - Register new admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/items` - Get all items (including unavailable)
- `POST /api/admin/items` - Create food item
- `DELETE /api/admin/items/:id` - Delete food item

**Users (requires Bearer token):**
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - User login

## Technology Stack

- **Frontend:** React, Vite, React Router
- **Backend:** Express.js, Node.js
- **Database:** MongoDB
- **Auth:** JWT tokens + bcrypt hashing
- **HTTP:** CORS enabled

## Database Schema

**admins collection:**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (bcrypt hashed),
  sessionToken: String,
  createdAt: Date,
  lastLogin: Date
}
```

**users collection:**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  hostelAndRoom: String,
  password: String (bcrypt hashed),
  sessionToken: String,
  createdAt: Date,
  lastLogin: Date
}
```

**food_items collection:**
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  imageUrl: String,
  isAvailable: Boolean,
  createdAt: Date
}
```

## Commands

```bash
# Backend
npm run dev      # Start with hot reload
npm start        # Start production

# Frontend
npm run dev      # Dev server
npm run build    # Build for production
npm run lint     # Lint code
```

## Troubleshooting

### Backend hangs on startup
- Make sure MongoDB is running (local or Atlas)
- Check `MONGODB_URI` in `.env` is correct
- See [MONGODB_SETUP.md](./MONGODB_SETUP.md)

### "Cannot connect to MongoDB"
- Verify connection string format
- For Atlas: Check IP whitelist and user credentials
- For local: Start MongoDB service (`mongod`)

### CORS errors
- Check `FRONTEND_ORIGIN` matches your frontend URL
- Default is `http://127.0.0.1:5173`
