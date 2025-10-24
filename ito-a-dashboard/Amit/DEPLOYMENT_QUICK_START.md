# 🚀 Quick Deployment Summary

## Your Current Setup
✅ **Frontend builds successfully** (947 KB bundle)  
✅ **Backend configured** with proper CORS  
✅ **Config file created** for API URL management  
✅ **Environment variables documented**  

---

## 🎯 What You Need to Do

### 1. Get Your Credentials (Do First!)

#### Google OAuth Setup:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (or use existing)
3. Save: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
4. Add redirect URI: `http://localhost:8000/auth/callback` (for testing)

#### Gemini API Key:
1. Go to: https://aistudio.google.com/app/apikey
2. Create API key
3. Save: `GEMINI_API_KEY`

#### Generate Secrets:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
Run twice to get keys for `SESSION_SECRET_KEY` and JWT `SECRET_KEY`

---

### 2. Deploy Backend to Render (15 mins)

1. **Sign up**: https://render.com/
2. **New Web Service** → Connect GitHub or manual
3. **Settings**:
   - Root Directory: `ITOA_Dashboard/src/backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables** (add in Render):
   ```
   GOOGLE_CLIENT_ID=your_value
   GOOGLE_CLIENT_SECRET=your_value
   SESSION_SECRET_KEY=your_generated_secret
   GEMINI_API_KEY=your_gemini_key
   FRONTEND_URL=http://localhost:3002
   ```
5. **Deploy** and save your URL: `https://xxx.onrender.com`

---

### 3. Update OAuth Redirect (After Backend Deploy)

1. Go back to Google Cloud Console
2. Edit OAuth Client
3. Add: `https://your-backend.onrender.com/auth/callback`

---

### 4. Update Frontend API URLs (Required!)

**You need to update 18 files** to use the new config:

Open each file and replace `'http://127.0.0.1:8000'` with the config import:

#### Files to Update:
1. `src/pages/LoginPage.tsx`
2. `src/pages/Settings.tsx`
3. `src/pages/AuthCallback.tsx`
4. `src/contexts/AuthContext.tsx` (3 locations)
5. `src/components/UploadCSVTab.tsx`
6. `src/components/LinkedInTab.tsx` (2 locations)
7. `src/components/SEOTab.tsx` (2 locations)
8. `src/components/BlogTab.tsx` (2 locations)
9. `src/components/OverviewTab.tsx`
10. `src/components/WebAnalyticsTab.tsx` (2 locations)
11. `src/components/EmailTab.tsx` (2 locations)

#### Example Change:
**Before**:
```typescript
const response = await fetch('http://127.0.0.1:8000/api/email/summary');
```

**After**:
```typescript
import { API_URL } from '../config';
//...
const response = await fetch(`${API_URL}/api/email/summary`);
```

---

### 5. Deploy Frontend to Vercel (10 mins)

1. **Sign up**: https://vercel.com/
2. **New Project** → Import from GitHub
3. **Settings**:
   - Root Directory: `ITOA_Dashboard`
   - Framework: Vite
   - Build: `npm run build`
   - Output: `build`
4. **Environment Variable**:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
5. **Deploy** and save your URL: `https://your-app.vercel.app`

---

### 6. Update Backend with Frontend URL

1. Go to Render dashboard
2. Update environment variable:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Render will auto-redeploy

---

### 7. Configure allowed_emails.json

Make sure `ITOA_Dashboard/src/backend/allowed_emails.json` has your email:
```json
{
  "allowed_emails": [
    "your-actual-email@gmail.com"
  ]
}
```

---

### 8. Test Everything! ✅

1. Visit your Vercel URL
2. Click "Sign in with Google"
3. Should login successfully
4. Check browser console (F12) - no CORS errors
5. Test AI recommendations
6. Test CSV upload

---

## ⚠️ Important Notes

### Free Tier Limitations:
- **Render Free**: Service sleeps after 15 min inactivity (first request takes 30s)
- **Vercel Free**: Unlimited bandwidth, 100 GB hours/month

### Security:
- ✅ CORS now restricts to your Vercel domain only
- ✅ JWT secrets need to be changed from defaults
- ✅ Only emails in `allowed_emails.json` can login

### If Something Breaks:
1. Check Render logs (in dashboard)
2. Check browser console (F12)
3. Verify all environment variables are set
4. Check CORS error? → Verify FRONTEND_URL matches Vercel URL exactly

---

## 📝 Still TODO

Before deployment is complete, you need to:
- [ ] Update 18 frontend files to use API_URL config
- [ ] Update JWT SECRET_KEY in auth.py (replace default)
- [ ] Test local build: `npm run build` (already done ✅)
- [ ] Test backend starts: `uvicorn app:app` (check for errors)

**Want me to help update all the frontend files automatically?** 

Just say "update all API URLs" and I'll fix all 18 files for you!

---

Last Updated: October 24, 2025
