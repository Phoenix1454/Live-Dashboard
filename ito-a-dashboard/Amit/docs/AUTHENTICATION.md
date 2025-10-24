# Authentication System Documentation

## Overview

The ItoA Dashboard now includes a complete JWT-based authentication system to secure your analytics data. All API endpoints and dashboard pages are protected and require user authentication.

## Features

✅ **JWT Token Authentication** - Secure token-based authentication with 30-minute expiration  
✅ **User Registration** - Create new user accounts with hashed passwords  
✅ **Persistent Sessions** - Stay logged in across browser refreshes using localStorage  
✅ **Protected Routes** - Dashboard pages require authentication  
✅ **Auto-Redirect** - Automatic redirect to login when tokens expire  
✅ **User Profile Display** - Shows logged-in user info in the sidebar  

## Quick Start

### 1. Start the Backend Server

```bash
cd Amit
python app.py
```

The backend will be available at `http://127.0.0.1:8000`

### 2. Start the Frontend

```bash
cd Amit/ITOA_Dashboard
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Login

**Demo Account:**
- Username: `demo`
- Password: `demo123`

This demo account is automatically created when the backend starts.

## User Management

### Register a New User

Users can be registered via the API:

```bash
curl -X POST http://127.0.0.1:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "securepassword",
    "email": "user@example.com",
    "full_name": "John Doe"
  }'
```

### Login

The frontend provides a login form at `/login`. You can also login via API:

```bash
curl -X POST http://127.0.0.1:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo&password=demo123"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Access Protected Endpoints

All analytics endpoints require authentication:

```bash
curl -X GET http://127.0.0.1:8000/api/overview \
  -H "Authorization: Bearer <your_token_here>"
```

## Architecture

### Backend (`app.py`)

**Authentication Endpoints:**
- `POST /register` - Register new users
- `POST /token` - Login and get JWT token
- `GET /users/me` - Get current user profile (protected)

**Analytics Endpoints (all protected):**
- `GET /api/overview` - Combined analytics overview
- `GET /api/email/campaigns` - Email campaign data
- `GET /api/linkedin/posts` - LinkedIn post data
- `GET /api/blog/posts` - Blog post data
- `GET /api/seo/metrics` - SEO metrics
- `GET /api/web/analytics` - Web analytics data
- ... and more

### Security Module (`auth.py`)

- **Algorithm:** HS256
- **Token Expiration:** 30 minutes
- **Password Hashing:** SHA256_crypt
- **Token Format:** Bearer `<jwt_token>`

### Database (`database.py`)

Currently uses in-memory storage for users. Can be easily replaced with:
- SQLite
- PostgreSQL
- MySQL
- MongoDB

### Frontend Components

**AuthContext** (`src/contexts/AuthContext.tsx`)
- Manages authentication state globally
- Handles login/logout
- Persists tokens to localStorage
- Provides hooks: `useAuth()`, `useAuthToken()`, `useCurrentUser()`

**ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
- Wrapper component for protected routes
- Redirects to `/login` if not authenticated
- Shows loading state during auth verification

**LoginForm** (`src/components/LoginForm.tsx`)
- User-friendly login interface
- Error handling and validation
- Shows demo credentials

**API Utilities** (`src/utils/api.ts`)
- Helper functions for authenticated requests
- Automatic token injection
- Auto-redirect on 401 Unauthorized

## Authentication Flow

1. **Initial Load:**
   - App checks localStorage for saved token
   - If token exists, verifies with backend
   - If valid, user is automatically logged in
   - If invalid/missing, shows login form

2. **Login:**
   - User enters credentials in LoginForm
   - Frontend calls `POST /token`
   - Backend validates credentials, returns JWT
   - Frontend fetches user profile from `GET /users/me`
   - Token and user data saved to localStorage
   - User is redirected to dashboard

3. **Authenticated Requests:**
   - All API calls include `Authorization: Bearer <token>` header
   - Backend validates token on each request
   - If token expired/invalid, returns 401
   - Frontend catches 401, clears auth data, redirects to login

4. **Logout:**
   - User clicks Logout button
   - Frontend clears localStorage
   - User is redirected to login

## Token Security

- Tokens expire after 30 minutes
- Stored in localStorage (persists across tabs)
- Automatically cleared on logout or 401 errors
- Uses secure HS256 algorithm
- Secret key should be changed in production

## Environment Variables

For production, set these in your environment:

```bash
# Backend
SECRET_KEY="your-secret-key-here"  # Change this!
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend (if needed)
VITE_API_BASE_URL="https://your-api-domain.com"
```

## Migration to Production Database

To replace the in-memory database with a real database:

1. **Install SQLAlchemy:**
   ```bash
   pip install sqlalchemy
   ```

2. **Update `database.py`:**
   - Replace dict storage with SQLAlchemy models
   - Add database connection
   - Update CRUD operations

3. **Create User table:**
   ```python
   from sqlalchemy import Column, String, Boolean
   from sqlalchemy.ext.declarative import declarative_base
   
   Base = declarative_base()
   
   class User(Base):
       __tablename__ = "users"
       username = Column(String, primary_key=True)
       hashed_password = Column(String)
       email = Column(String)
       full_name = Column(String)
       disabled = Column(Boolean, default=False)
   ```

## Troubleshooting

**Problem:** Login fails with "Incorrect username or password"
- **Solution:** Check that the demo user is created (should happen automatically on backend startup)
- **Solution:** Verify you're using correct credentials: demo/demo123

**Problem:** Token expired errors
- **Solution:** Login again to get a new token
- **Solution:** Increase `ACCESS_TOKEN_EXPIRE_MINUTES` in `auth.py`

**Problem:** 401 Unauthorized on API calls
- **Solution:** Check that token is being sent in Authorization header
- **Solution:** Verify token hasn't expired (30 min default)
- **Solution:** Clear localStorage and login again

**Problem:** CORS errors
- **Solution:** Backend includes CORS middleware, check it's configured correctly
- **Solution:** Verify API_BASE_URL in frontend matches backend URL

## Security Best Practices

1. ✅ **Change SECRET_KEY** - Use a strong, random secret key in production
2. ✅ **Use HTTPS** - Always use HTTPS in production
3. ✅ **Secure Headers** - Add security headers (HSTS, CSP, etc.)
4. ✅ **Rate Limiting** - Add rate limiting to prevent brute force attacks
5. ✅ **Input Validation** - Validate all user inputs
6. ⚠️ **Database Migration** - Move from in-memory to persistent database
7. ⚠️ **Password Policy** - Enforce strong password requirements
8. ⚠️ **Refresh Tokens** - Implement refresh tokens for better UX

## API Reference

### POST /register

Register a new user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "full_name": "string"
}
```

**Response:**
```json
{
  "username": "string",
  "email": "string",
  "full_name": "string",
  "disabled": false
}
```

### POST /token

Login and receive JWT token.

**Request Body (form-encoded):**
```
username=demo&password=demo123
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### GET /users/me

Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "username": "demo",
  "email": "demo@example.com",
  "full_name": "Demo User",
  "disabled": false
}
```

## Frontend Hooks

### useAuth()

Access full authentication context.

```typescript
const { isAuthenticated, user, token, login, logout, isLoading, error } = useAuth();
```

### useAuthToken()

Get just the JWT token.

```typescript
const token = useAuthToken();
```

### useCurrentUser()

Get just the user object.

```typescript
const user = useCurrentUser();
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments in `auth.py` and `AuthContext.tsx`
3. Verify backend is running on port 8000
4. Check browser console for errors
