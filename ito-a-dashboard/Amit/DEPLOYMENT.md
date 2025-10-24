# ItoA Dashboard - Deployment Guide (Render + Vercel)

## 🎯 Architecture Overview

Your dashboard uses a **decoupled architecture**:
- **Backend (FastAPI/Python)** → Deploy to **Render**
- **Frontend (React/TypeScript)** → Deploy to **Vercel**

Both platforms offer generous free tiers and are production-ready.

---

## 📋 Pre-Deployment Checklist

### ✅ Required Before Deployment
- [ ] Google OAuth credentials (Client ID & Secret)
- [ ] Gemini API key from Google AI Studio
- [ ] List of authorized user emails
- [ ] Render account (render.com)
- [ ] Vercel account (vercel.com)
- [ ] GitHub repository (optional but recommended)

---

## 🔧 Part 1: Backend Deployment (Render)

### Step 1: Prepare Backend Configuration

**Update CORS Settings** (Important for production):

The backend currently allows ALL origins (`allow_origins=["*"]`). You'll update this after deployment with your Vercel URL.

**Environment Variables Needed**:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET_KEY=generate_with_python_command
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=https://your-app.vercel.app
```

**Generate Secure Keys**:
```bash
# Generate SESSION_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT SECRET_KEY (update in auth.py)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 2: Deploy to Render

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Or use "Deploy from Git URL"

3. **Configure Service**:
   ```
   Name: itoa-dashboard-backend
   Region: Choose closest to your users
   Branch: main
   Root Directory: ITOA_Dashboard/src/backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

4. **Add Environment Variables** (in Render dashboard):
   ```
   GOOGLE_CLIENT_ID = your_client_id
   GOOGLE_CLIENT_SECRET = your_client_secret
   SESSION_SECRET_KEY = generated_secret_key
   GEMINI_API_KEY = your_gemini_key
   FRONTEND_URL = https://your-app.vercel.app (add after Vercel deployment)
   ```

5. **Configure OAuth Redirect** (in Google Cloud Console):
   - Go to: https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client
   - Add authorized redirect URI: `https://your-backend.onrender.com/auth/callback`

6. **Upload Files** (if not using Git):
   - Ensure `allowed_emails.json` is in the backend directory
   - Ensure `data/` folder with CSVs is present

7. **Deploy**: Click "Create Web Service"

8. **Note Your Backend URL**: `https://your-backend.onrender.com`

### Step 3: Update CORS After Getting Vercel URL

After frontend deployment, you'll need to update the backend's CORS settings to only allow your Vercel domain.

---

## 🎨 Part 2: Frontend Deployment (Vercel)

### Step 1: Update Frontend Configuration

**Create API Configuration File**:

Create `ITOA_Dashboard/src/config.ts`:
```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
```

**Update all API calls to use this config** (18 files need updating):
- LoginPage.tsx
- AuthContext.tsx
- AuthCallback.tsx
- UploadCSVTab.tsx
- LinkedInTab.tsx
- SEOTab.tsx
- BlogTab.tsx
- OverviewTab.tsx
- WebAnalyticsTab.tsx
- EmailTab.tsx
- Settings.tsx

Replace `'http://127.0.0.1:8000'` with `import { API_URL } from '@/config'` and use `${API_URL}` in fetch calls.

### Step 2: Deploy to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Or drag-and-drop your `ITOA_Dashboard` folder

3. **Configure Project**:
   ```
   Framework Preset: Vite
   Root Directory: ITOA_Dashboard
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   Node.js Version: 18.x
   ```

4. **Add Environment Variable**:
   ```
   VITE_API_URL = https://your-backend.onrender.com
   ```

5. **Deploy**: Click "Deploy"

6. **Note Your Frontend URL**: `https://your-app.vercel.app`

### Step 3: Update Backend with Frontend URL

1. Go back to Render dashboard
2. Update `FRONTEND_URL` environment variable to your Vercel URL
3. Update CORS settings in `app.py` (see next section)

---

## 🔐 Part 3: Security Hardening

### Update CORS Settings

In `app.py` (lines 68-74), replace:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # CHANGE THIS!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

With:
```python
# Production CORS - only allow your Vercel frontend
ALLOWED_ORIGINS = [
    os.getenv('FRONTEND_URL', 'http://localhost:3002'),
    'http://localhost:3002',  # For local development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**After making this change**, commit and push to trigger Render redeploy.

### Update JWT Secret in auth.py

Check `ITOA_Dashboard/src/backend/auth.py` and ensure `SECRET_KEY` is secure (not the default "your-secret-key-here").

### Verify allowed_emails.json

Ensure only authorized emails are listed:
```json
{
  "allowed_emails": [
    "your-real-email@example.com"
  ]
}
```

---

## 🧪 Part 4: Testing Your Deployment

### Test Checklist:
1. **Backend Health**:
   - Visit: `https://your-backend.onrender.com/docs`
   - Should show FastAPI Swagger UI

2. **Frontend Loads**:
   - Visit: `https://your-app.vercel.app`
   - Should show login page

3. **Google OAuth**:
   - Click "Sign in with Google"
   - Should redirect to Google login
   - Should redirect back to your app after auth

4. **API Calls Work**:
   - After login, check browser console (F12)
   - Should see successful API calls to your Render backend
   - No CORS errors

5. **AI Features**:
   - Test AI recommendations
   - Test dynamic CSV analysis
   - Should work without Gemini API errors

---

## 🚨 Common Issues & Solutions

### Issue 1: "Failed to fetch" or CORS errors
**Cause**: CORS not configured properly or FRONTEND_URL mismatch  
**Solution**: 
- Verify `FRONTEND_URL` in Render matches your Vercel URL exactly
- Update CORS settings in app.py as shown above
- Redeploy backend after changes

### Issue 2: "GEMINI_API_KEY not found"
**Cause**: Environment variable not set in Render  
**Solution**: Add `GEMINI_API_KEY` to Render environment variables

### Issue 3: OAuth redirect loop
**Cause**: Google OAuth redirect URI mismatch  
**Solution**: In Google Cloud Console, ensure redirect URI is exactly: `https://your-backend.onrender.com/auth/callback`

### Issue 4: "Access Denied" on login
**Cause**: User email not in allowed_emails.json  
**Solution**: Add email to allowed_emails.json and redeploy

### Issue 5: Render service won't start
**Cause**: Missing requirements.txt or wrong Python version  
**Solution**: 
- Ensure `requirements.txt` is in `ITOA_Dashboard/src/backend/`
- Set Python version to 3.9+ in Render settings

### Issue 6: Frontend shows localhost URLs
**Cause**: API_URL not updated in React components  
**Solution**: Update all fetch calls to use config.ts with VITE_API_URL

---

## 📊 Environment Variables Summary

### Backend (Render):
```bash
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
SESSION_SECRET_KEY=<generated secure key>
GEMINI_API_KEY=<from Google AI Studio>
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel):
```bash
VITE_API_URL=https://your-backend.onrender.com
```

---

## 🔄 Redeployment Process

### Update Backend:
1. Push changes to GitHub
2. Render auto-deploys (if connected to Git)
3. Or manually trigger deploy in Render dashboard

### Update Frontend:
1. Push changes to GitHub
2. Vercel auto-deploys (if connected to Git)
3. Or run `vercel --prod` from terminal

---

## 📞 Useful Links

- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com/
- **Google AI Studio**: https://aistudio.google.com/app/apikey
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

## ✅ Post-Deployment Checklist

- [ ] Backend deployed and accessible at `/docs` endpoint
- [ ] Frontend deployed and loads correctly
- [ ] CORS configured with specific Vercel domain
- [ ] Google OAuth working end-to-end
- [ ] Environment variables set in both platforms
- [ ] allowed_emails.json contains correct emails
- [ ] All API calls working (check browser console)
- [ ] AI recommendations working
- [ ] CSV upload and analysis working
- [ ] No console errors on frontend
- [ ] SSL/HTTPS working on both domains

---

Last Updated: October 24, 2025  
Platforms: Render (Backend) + Vercel (Frontend)
