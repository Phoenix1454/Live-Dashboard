# Authentication Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Application                      │  │
│  │                                                           │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐  │  │
│  │  │ LoginForm  │  │   App.tsx   │  │  ProtectedRoute  │  │  │
│  │  │ Component  │  │  (Routing)  │  │   Wrapper        │  │  │
│  │  └──────┬─────┘  └──────┬──────┘  └────────┬─────────┘  │  │
│  │         │               │                  │            │  │
│  │         └───────────────┴──────────────────┘            │  │
│  │                         │                               │  │
│  │              ┌──────────▼──────────┐                    │  │
│  │              │   AuthContext       │                    │  │
│  │              │                     │                    │  │
│  │              │ • isAuthenticated   │                    │  │
│  │              │ • user              │                    │  │
│  │              │ • token             │                    │  │
│  │              │ • login()           │                    │  │
│  │              │ • logout()          │                    │  │
│  │              └──────────┬──────────┘                    │  │
│  │                         │                               │  │
│  │              ┌──────────▼──────────┐                    │  │
│  │              │   API Utils         │                    │  │
│  │              │                     │                    │  │
│  │              │ • authenticatedFetch│                    │  │
│  │              │ • Auto-inject token │                    │  │
│  │              │ • Handle 401 errors │                    │  │
│  │              └──────────┬──────────┘                    │  │
│  │                         │                               │  │
│  └─────────────────────────┼───────────────────────────────┘  │
│                            │                                  │
│                 ┌──────────▼──────────┐                       │
│                 │   localStorage      │                       │
│                 │                     │                       │
│                 │ • auth_token (JWT)  │                       │
│                 │ • auth_user (JSON)  │                       │
│                 └─────────────────────┘                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                   HTTP Requests (with JWT)
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      FastAPI Backend                            │
│                   (http://127.0.0.1:8000)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      app.py                               │  │
│  │                                                           │  │
│  │  Authentication Endpoints:                                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ POST /register     → Create new user              │  │  │
│  │  │ POST /token        → Login, get JWT token         │  │  │
│  │  │ GET  /users/me     → Get current user (protected) │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Protected Analytics Endpoints:                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ GET  /api/overview                                 │  │  │
│  │  │ GET  /api/email/campaigns                          │  │  │
│  │  │ GET  /api/linkedin/posts                           │  │  │
│  │  │ POST /api/upload/{channel_type}                    │  │  │
│  │  │ ... (11 total analytics endpoints)                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                           │                               │  │
│  │              ┌────────────▼────────────┐                  │  │
│  │              │   Depends: OAuth2       │                  │  │
│  │              │   get_current_user()    │                  │  │
│  │              └────────────┬────────────┘                  │  │
│  └───────────────────────────┼───────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                      auth.py                              │  │
│  │                                                           │  │
│  │  • verify_password()                                      │  │
│  │  • get_password_hash()                                    │  │
│  │  • create_access_token()    ← Creates JWT                 │  │
│  │  • decode_access_token()    ← Validates JWT               │  │
│  │  • get_current_user()       ← Dependency for protection   │  │
│  │                                                           │  │
│  │  Security Config:                                         │  │
│  │  • Algorithm: HS256                                       │  │
│  │  • Expiration: 30 minutes                                 │  │
│  │  • Hashing: SHA256_crypt                                  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                    database.py                            │  │
│  │                                                           │  │
│  │  • users_db: Dict[str, UserInDB]  (in-memory storage)    │  │
│  │  • get_user(username)                                     │  │
│  │  • create_user(...)              → Hashes password        │  │
│  │  • authenticate_user(...)         → Verifies credentials  │  │
│  │  • initialize_demo_user()         → Creates demo/demo123  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow Sequence

### 1. Initial App Load
```
User opens app
      ↓
AuthContext useEffect runs
      ↓
Check localStorage for 'auth_token'
      ↓
   ┌──────────────┬──────────────┐
   │              │              │
Token exists   No token    Token expired
   │              │              │
   ↓              ↓              ↓
Verify with   Show Login    Clear storage
 /users/me      Form         Show Login
   │
   ↓
Valid token?
   │
   ├─ Yes → Set authenticated, show Dashboard
   └─ No  → Clear storage, show Login
```

### 2. Login Flow
```
User enters credentials
      ↓
LoginForm.handleSubmit()
      ↓
POST /token (username, password)
      ↓
Backend authenticates
      ↓
   ┌──────────────┬──────────────┐
   │              │              │
 Valid        Invalid
   │              │
   ↓              ↓
Return JWT    Return error
   │              │
   ↓              ↓
Store token   Show error
   │           message
   ↓
GET /users/me (with Bearer token)
   │
   ↓
Receive user data
   │
   ↓
Store user in localStorage
   │
   ↓
Set isAuthenticated = true
   │
   ↓
Redirect to Dashboard
```

### 3. Protected API Call Flow
```
Component needs data
      ↓
Call authenticatedFetch('/api/overview')
      ↓
Get token from localStorage
      ↓
Add Authorization: Bearer <token>
      ↓
Send request to backend
      ↓
Backend validates token (get_current_user)
      ↓
   ┌──────────────┬──────────────┐
   │              │              │
Valid token   Invalid/Expired
   │              │
   ↓              ↓
Process        Return 401
request          │
   │             ↓
   │        Frontend catches 401
   │             │
   │             ↓
   │        Clear localStorage
   │             │
   │             ↓
   │        Redirect to /login
   │
   ↓
Return data to component
```

### 4. Logout Flow
```
User clicks Logout button
      ↓
Sidebar.handleLogout()
      ↓
Call logout() from AuthContext
      ↓
Clear isAuthenticated
      ↓
Clear user state
      ↓
Clear token state
      ↓
Remove from localStorage
      ↓
Redirect to /login
```

## Component Hierarchy

```
App (wrapped with AuthProvider)
├── Router
    ├── Route: /login
    │   └── LoginForm (public)
    │       └── useAuth() hook
    │
    └── Route: /* (all other routes)
        └── ProtectedRoute wrapper
            └── useAuth() to check authentication
                │
                ├── If authenticated:
                │   └── Dashboard Layout
                │       ├── Sidebar
                │       │   ├── User Info (from useAuth)
                │       │   ├── Navigation
                │       │   └── Logout Button
                │       │
                │       └── Main Content
                │           ├── Route: /
                │           │   └── Dashboard
                │           │       └── Tab Components
                │           │           ├── OverviewTab
                │           │           ├── EmailTab
                │           │           ├── LinkedInTab
                │           │           ├── BlogTab
                │           │           ├── SEOTab
                │           │           ├── WebAnalyticsTab
                │           │           └── UploadCSVTab
                │           │
                │           └── Route: /settings
                │               └── Settings Page
                │                   └── CSV Upload
                │
                └── If not authenticated:
                    └── Navigate to /login
```

## Data Flow

### Token Storage
```
┌─────────────────┐
│  localStorage   │
├─────────────────┤
│ auth_token:     │
│  "eyJhbGci..."  │  ← JWT token (expires in 30 min)
│                 │
│ auth_user:      │
│  {              │
│    username,    │  ← User profile data
│    email,       │
│    full_name,   │
│    disabled     │
│  }              │
└─────────────────┘
```

### JWT Token Structure
```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "demo",           ← username
  "exp": 1234567890        ← expiration timestamp
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  SECRET_KEY
)
```

## Security Layers

```
Layer 1: Frontend Protection
└── ProtectedRoute checks isAuthenticated
    └── Redirects to /login if false

Layer 2: API Request Protection
└── authenticatedFetch adds Authorization header
    └── Handles 401 responses

Layer 3: Backend Endpoint Protection
└── Depends(get_current_active_user)
    └── Validates JWT token
        └── Checks expiration
            └── Verifies signature
                └── Returns user or raises 401

Layer 4: Password Protection
└── SHA256_crypt hashing
    └── Never stores plain passwords
```

## Error Handling

```
Authentication Errors:
├── Invalid credentials
│   └── Show error in LoginForm
├── Token expired
│   └── Clear storage → Redirect to /login
├── Token invalid
│   └── Clear storage → Redirect to /login
├── Network error
│   └── Show error message
└── 401 Unauthorized
    └── Auto-logout → Redirect to /login
```

## State Management

```
AuthContext State:
┌────────────────────────────────────┐
│ isAuthenticated: boolean           │ ← Is user logged in?
│ user: User | null                  │ ← User profile data
│ token: string | null               │ ← JWT token
│ isLoading: boolean                 │ ← Loading state
│ error: string | null               │ ← Error message
│                                    │
│ Functions:                         │
│ - login(username, password)        │
│ - logout()                         │
│ - verifyToken()                    │
│ - clearAuthData()                  │
└────────────────────────────────────┘
```

---

This architecture provides:
✅ Secure authentication
✅ Persistent sessions
✅ Protected routes
✅ Auto-logout on expiration
✅ Clean separation of concerns
✅ Type-safe implementation
