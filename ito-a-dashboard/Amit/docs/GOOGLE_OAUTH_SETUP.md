# Google OAuth Setup Guide

## Prerequisites
- Google Cloud Console account
- Your application running locally or deployed

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name**: ItoA Dashboard
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `http://127.0.0.1:8000` (for local backend)
     - Add your production URLs when deploying
   - **Authorized redirect URIs**:
     - `http://127.0.0.1:8000/auth/google`
     - `http://localhost:8000/auth/google`
     - Add your production backend URL + `/auth/google` when deploying
7. Click **Create**
8. Copy your **Client ID** and **Client Secret**

## Step 2: Configure Backend

1. Create a `.env` file in the backend directory:
   ```bash
   cd /Users/phoenix/Documents/MscProject/ito-a-dashboard/Amit/ITOA_Dashboard/src/backend
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   FRONTEND_URL=http://localhost:5173
   ```

3. Install python-dotenv to load environment variables:
   ```bash
   pip3 install python-dotenv
   ```

4. Update `app.py` to load the `.env` file (add at the top):
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   ```

## Step 3: Test the OAuth Flow

1. Start your backend:
   ```bash
   cd src/backend
   python3 app.py
   ```

2. Start your frontend:
   ```bash
   cd ITOA_Dashboard
   npm run dev
   ```

3. Navigate to: `http://127.0.0.1:8000/login/google`

4. You should be redirected to Google's consent screen

5. After authorizing, you'll be redirected back to your frontend with a JWT token

## OAuth Flow Diagram

```
User clicks "Sign in with Google"
    ↓
Frontend redirects to: /login/google
    ↓
Backend redirects to Google OAuth consent screen
    ↓
User grants permission
    ↓
Google redirects to: /auth/google?code=...
    ↓
Backend exchanges code for access token
    ↓
Backend fetches user profile from Google
    ↓
Backend checks if user exists in database
    ↓
If new user → Create user with email as username
If existing → Retrieve user
    ↓
Backend generates internal JWT token
    ↓
Backend redirects to: http://localhost:5173/auth/callback?token=JWT_TOKEN
    ↓
Frontend receives token and stores it
    ↓
User is logged in!
```

## API Endpoints Added

### 1. GET /login/google
Initiates the OAuth flow by redirecting to Google's consent screen.

**Usage:**
```bash
curl http://127.0.0.1:8000/login/google
```

Or in your frontend:
```javascript
window.location.href = 'http://127.0.0.1:8000/login/google';
```

### 2. GET /auth/google
OAuth callback endpoint. Google redirects here after user consent.

**This endpoint automatically:**
- Receives authorization code
- Exchanges it for access token
- Fetches user profile
- Creates/retrieves user in database
- Generates JWT token
- Redirects to frontend with token

## Frontend Integration

You'll need to create a callback page at `/auth/callback` in your React app:

```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth(); // You may need to add these methods

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      // Store the token
      localStorage.setItem('auth_token', token);
      
      // Fetch user profile with this token
      fetch('http://127.0.0.1:8000/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(user => {
          localStorage.setItem('auth_user', JSON.stringify(user));
          // Update context
          // Navigate to dashboard
          navigate('/', { replace: true });
        })
        .catch(err => {
          console.error('Failed to fetch user:', err);
          navigate('/login?error=auth_failed');
        });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
        <p className="text-slate-400">Completing sign in...</p>
      </div>
    </div>
  );
}
```

Add a "Sign in with Google" button to your login page:

```typescript
// In LoginPage.tsx
<button
  onClick={() => window.location.href = 'http://127.0.0.1:8000/login/google'}
  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-white hover:bg-slate-800 transition-colors"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Sign in with Google
</button>
```

## Security Notes

1. **Never commit your `.env` file** - Add it to `.gitignore`
2. **Use HTTPS in production** - OAuth requires secure connections
3. **Validate redirect URIs** - Only allow whitelisted domains
4. **Rotate secrets regularly** - Change your Client Secret periodically
5. **Limit OAuth scopes** - Only request what you need (we use: openid, email, profile)

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Check that your redirect URI in Google Console exactly matches `http://127.0.0.1:8000/auth/google`
- No trailing slashes
- Correct protocol (http/https)
- Correct port

**Error: "invalid_client"**
- Check your Client ID and Client Secret are correct
- Make sure `.env` file is loaded

**User not redirected**
- Check FRONTEND_URL is set correctly
- Check browser console for errors
- Verify frontend is running on the correct port

## Production Deployment

When deploying to production:

1. Update authorized origins and redirect URIs in Google Console
2. Set production environment variables:
   ```
   GOOGLE_CLIENT_ID=your_production_client_id
   GOOGLE_CLIENT_SECRET=your_production_client_secret
   FRONTEND_URL=https://yourdomain.com
   ```
3. Use HTTPS for all URLs
4. Consider using a secrets manager (AWS Secrets Manager, Google Secret Manager, etc.)
