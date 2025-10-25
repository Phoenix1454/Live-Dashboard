from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
import pandas as pd
import os
import json
from textblob import TextBlob
from wordcloud import WordCloud
import random
from io import StringIO
from datetime import timedelta
from typing import Optional, Dict, Any, List
from authlib.integrations.starlette_client import OAuth
import httpx
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Import authentication modules
from auth import (
    Token, User, UserInDB, create_access_token, 
    get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import create_user, authenticate_user, get_user
from pydantic import BaseModel

# Import AI recommendation module
from recommender import get_gemini_recommendations

# ========================================
# EMAIL ALLOWLIST FOR GOOGLE SIGN-IN
# ========================================
# Load allowed emails from JSON file
def load_allowed_emails():
    """Load allowed emails from allowed_emails.json file"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(script_dir, "allowed_emails.json")
        
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
                emails = set(data.get('allowed_emails', []))
                print(f"✅ Loaded {len(emails)} allowed email(s) from allowed_emails.json")
                return emails
        else:
            return {"ak1454789@gmail.com"}
    except Exception as e:
        return {"ak1454789@gmail.com"}  # Fallback to default

# Load allowed emails on startup
ALLOWED_EMAILS = load_allowed_emails()

app = FastAPI(title="ItoA Analytics API", version="1.0.0")

# Add session middleware (required for OAuth)
# Generate a secure secret key: python -c "import secrets; print(secrets.token_urlsafe(32))"
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv('SESSION_SECRET_KEY', 'your-secret-session-key-change-in-production')
)

# CORS Configuration
# For production: set FRONTEND_URL env variable to your Vercel domain
ALLOWED_ORIGINS = [
    os.getenv('FRONTEND_URL', 'http://localhost:3002'),
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:5173',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# GOOGLE OAUTH CONFIGURATION
# ========================================

# OAuth configuration
oauth = OAuth()

# Configure Google OAuth client
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET', 'YOUR_GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# Frontend redirect URL (where to send user after successful OAuth)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3003')

# --- Path Calculation ---
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, "data", "email_campaigns.csv")
linkedin_csv_path = os.path.join(script_dir, "data", "linkedin_posts.csv")
blog_csv_path = os.path.join(script_dir, "data", "blog_posts.csv")
seo_csv_path = os.path.join(script_dir, "data", "seo_metrics_daily.csv")
web_analytics_csv_path = os.path.join(script_dir, "data", "web_analytics_daily.csv")

# --- Pydantic Models for User Registration ---
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    message: str

# ========================================
# AUTHENTICATION ENDPOINTS
# ========================================

@app.post("/register", response_model=UserResponse, tags=["Authentication"])
def register_user(user_data: UserCreate):
    """
    Register a new user.
    
    - **username**: Unique username (required)
    - **password**: User password (required)
    - **email**: User email (optional)
    - **full_name**: User's full name (optional)
    """
    try:
        user = create_user(
            username=user_data.username,
            password=user_data.password,
            email=user_data.email,
            full_name=user_data.full_name
        )
        return UserResponse(
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            message="User registered successfully"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during registration: {str(e)}"
        )

@app.post("/token", response_model=Token, tags=["Authentication"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login endpoint to obtain JWT access token.
    
    - **username**: Your username
    - **password**: Your password
    
    Returns a JWT access token that expires in 30 minutes.
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")

@app.get("/users/me", response_model=User, tags=["Authentication"])
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get the profile of the currently logged-in user.
    
    This is a protected endpoint that requires a valid JWT token.
    Include the token in the Authorization header: `Bearer <token>`
    """
    return current_user

# ========================================
# GOOGLE OAUTH ENDPOINTS
# ========================================

@app.get("/login/google", tags=["OAuth"])
async def login_google(request: Request):
    """
    Initiates Google OAuth flow.
    Redirects the user to Google's consent screen.
    """
    # Build the redirect URI for the callback
    redirect_uri = request.url_for('auth_google')
    
    # Redirect to Google's OAuth consent screen
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/google", tags=["OAuth"])
async def auth_google(request: Request):
    """
    Google OAuth callback endpoint.
    
    This endpoint:
    1. Receives the authorization code from Google
    2. Exchanges it for an access token
    3. Fetches the user's profile information
    4. Creates or retrieves the user in our database
    5. Generates our own JWT token
    6. Redirects to frontend with the JWT token
    """
    try:
        # Exchange authorization code for access token
        token = await oauth.google.authorize_access_token(request)
        print(f"🔵 Token received: {token.keys() if token else 'None'}")
        
        # Get user info from Google
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(
                status_code=400,
                detail="Failed to get user info from Google"
            )
        
        # Extract user details
        email = user_info.get('email')
        full_name = user_info.get('name')
        google_id = user_info.get('sub')  # Google's unique user ID
        
        if not email:
            raise HTTPException(
                status_code=400,
                detail="Email not provided by Google"
            )
        
        # ========================================
        # ALLOWLIST CHECK - CRITICAL SECURITY
        # ========================================
        # Check if the user's email is in the allowlist
        if email not in ALLOWED_EMAILS:
            print(f"❌ Access denied for email: {email} (not in allowlist)")
            # Redirect to login page with access denied error
            error_redirect_url = f"{FRONTEND_URL}/login?error=access_denied"
            return RedirectResponse(url=error_redirect_url)
        
        # Check if user exists in our database (by email)
        existing_user = get_user(email)
        
        if not existing_user:
            # Create new user with email as username
            # Generate a random password (user won't use it, they'll use Google OAuth)
            import secrets
            random_password = secrets.token_urlsafe(32)
            
            try:
                user = create_user(
                    username=email,  # Use email as username
                    password=random_password,
                    email=email,
                    full_name=full_name
                )
            except ValueError as e:
                # If username (email) already exists, fetch that user
                existing_user = get_user(email)
                if not existing_user:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to create or retrieve user: {str(e)}"
                    )
                user = existing_user
        else:
            user = existing_user
        
        # Create our internal JWT access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, 
            expires_delta=access_token_expires
        )
        
        # Redirect to frontend with the JWT token
        redirect_url = f"{FRONTEND_URL}/auth/callback?token={access_token}"
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        # Redirect to frontend with error
        error_message = str(e)
        import traceback
        traceback.print_exc()
        redirect_url = f"{FRONTEND_URL}/login?error={error_message}"
        return RedirectResponse(url=redirect_url)

# ========================================
# DATA ANALYTICS ENDPOINTS
# ========================================

@app.get("/api/email/campaigns", tags=["Email Analytics"])
def get_email_campaigns():
    """
    Reads email campaign data from a CSV file and returns it as a JSON array.
    """
    try:
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {csv_path}"
            )

        df = pd.read_csv(csv_path)
        
        if df.empty:
            return []

        # Convert the DataFrame to a list of dictionaries
        data = df.to_dict(orient="records")
        return data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/email/summary")
def get_email_summary():
    """
    Reads and processes email campaign data to return a full summary
    including KPIs, funnel data, and top campaigns.
    """
    try:
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {csv_path}"
            )

        df = pd.read_csv(csv_path)
        
        if df.empty:
            return {
                "kpis": {},
                "funnelData": [],
                "topCampaigns": [],
                "rawCampaigns": []
            }

        # --- KPI Calculations ---
        total_sends = df['sends'].sum()
        total_opens = df['opens'].sum()
        total_clicks = df['clicks'].sum()
        total_unsubscribes = df['unsubscribe'].sum()

        avg_open_rate = (total_opens / total_sends) * 100 if total_sends > 0 else 0
        avg_ctor = (total_clicks / total_opens) * 100 if total_opens > 0 else 0
        unsubscribe_rate = (total_unsubscribes / total_sends) * 100 if total_sends > 0 else 0

        # --- Trend Calculations (Current vs Previous Period) ---
        # Split data into two halves for trend comparison
        mid_point = len(df) // 2
        
        # Previous period (first half)
        prev_df = df.iloc[:mid_point]
        prev_sends = prev_df['sends'].sum()
        prev_opens = prev_df['opens'].sum()
        prev_clicks = prev_df['clicks'].sum()
        prev_unsubscribes = prev_df['unsubscribe'].sum()
        
        prev_open_rate = (prev_opens / prev_sends) * 100 if prev_sends > 0 else 0
        prev_ctor = (prev_clicks / prev_opens) * 100 if prev_opens > 0 else 0
        prev_unsubscribe_rate = (prev_unsubscribes / prev_sends) * 100 if prev_sends > 0 else 0
        
        # Current period (second half)
        curr_df = df.iloc[mid_point:]
        curr_sends = curr_df['sends'].sum()
        curr_opens = curr_df['opens'].sum()
        curr_clicks = curr_df['clicks'].sum()
        curr_unsubscribes = curr_df['unsubscribe'].sum()
        
        curr_open_rate = (curr_opens / curr_sends) * 100 if curr_sends > 0 else 0
        curr_ctor = (curr_clicks / curr_opens) * 100 if curr_opens > 0 else 0
        curr_unsubscribe_rate = (curr_unsubscribes / curr_sends) * 100 if curr_sends > 0 else 0
        
        # Calculate percentage change
        open_rate_trend = ((curr_open_rate - prev_open_rate) / prev_open_rate * 100) if prev_open_rate > 0 else 0
        ctor_trend = ((curr_ctor - prev_ctor) / prev_ctor * 100) if prev_ctor > 0 else 0
        unsubscribe_rate_trend = ((curr_unsubscribe_rate - prev_unsubscribe_rate) / prev_unsubscribe_rate * 100) if prev_unsubscribe_rate > 0 else 0
        total_clicks_trend = ((curr_clicks - prev_clicks) / prev_clicks * 100) if prev_clicks > 0 else 0

        kpis = {
            "avgOpenRate": avg_open_rate,
            "avgCtor": avg_ctor,
            "unsubscribeRate": unsubscribe_rate,
            "totalClicks": int(total_clicks),
            "trends": {
                "openRate": round(open_rate_trend, 2),
                "ctor": round(ctor_trend, 2),
                "unsubscribeRate": round(unsubscribe_rate_trend, 2),
                "totalClicks": round(total_clicks_trend, 2)
            }
        }

        # --- Funnel Data ---
        funnel_data = [
            { "stage": 'Sends', "value": int(total_sends), "color": '#14b8a6' },
            { "stage": 'Opens', "value": int(total_opens), "color": '#a855f7' },
            { "stage": 'Clicks', "value": int(total_clicks), "color": '#22c55e' },
        ]

        # --- Top Campaigns ---
        top_campaigns = df.sort_values(by='clicks', ascending=False).head(10)

        # --- Full Payload ---
        summary = {
            "kpis": kpis,
            "funnelData": funnel_data,
            "topCampaigns": top_campaigns.to_dict(orient="records"),
            "rawCampaigns": df.to_dict(orient="records")
        }
        
        return summary

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/linkedin/posts")
def get_linkedin_posts():
    """
    Reads LinkedIn posts data from a CSV file and returns it as a JSON array.
    """
    try:
        if not os.path.exists(linkedin_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {linkedin_csv_path}"
            )

        df = pd.read_csv(linkedin_csv_path)
        
        if df.empty:
            return []

        # Convert the DataFrame to a list of dictionaries
        data = df.to_dict(orient="records")
        return data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/linkedin/summary")
def get_linkedin_summary():
    """
    Reads and processes LinkedIn posts data to return a full summary
    including KPIs and analytics.
    """
    try:
        if not os.path.exists(linkedin_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {linkedin_csv_path}"
            )

        df = pd.read_csv(linkedin_csv_path)
        
        if df.empty:
            return {
                "kpis": {},
                "rawPosts": []
            }

        # --- KPI Calculations ---
        total_posts = len(df)
        total_impressions = df['impressions'].sum()
        total_likes = df['likes'].sum()
        total_comments = df['comments'].sum()
        total_shares = df['shares'].sum()
        
        total_reactions = total_likes + total_comments + total_shares
        
        avg_engagement_rate = (total_reactions / total_impressions) * 100 if total_impressions > 0 else 0

        # --- Trend Calculations (Current vs Previous Period) ---
        mid_point = len(df) // 2
        
        # Previous period (first half)
        prev_df = df.iloc[:mid_point]
        prev_impressions = prev_df['impressions'].sum()
        prev_likes = prev_df['likes'].sum()
        prev_comments = prev_df['comments'].sum()
        prev_shares = prev_df['shares'].sum()
        prev_reactions = prev_likes + prev_comments + prev_shares
        prev_engagement_rate = (prev_reactions / prev_impressions) * 100 if prev_impressions > 0 else 0
        
        # Current period (second half)
        curr_df = df.iloc[mid_point:]
        curr_impressions = curr_df['impressions'].sum()
        curr_likes = curr_df['likes'].sum()
        curr_comments = curr_df['comments'].sum()
        curr_shares = curr_df['shares'].sum()
        curr_reactions = curr_likes + curr_comments + curr_shares
        curr_engagement_rate = (curr_reactions / curr_impressions) * 100 if curr_impressions > 0 else 0
        
        # Calculate percentage change
        posts_trend = ((len(curr_df) - len(prev_df)) / len(prev_df) * 100) if len(prev_df) > 0 else 0
        impressions_trend = ((curr_impressions - prev_impressions) / prev_impressions * 100) if prev_impressions > 0 else 0
        engagement_rate_trend = ((curr_engagement_rate - prev_engagement_rate) / prev_engagement_rate * 100) if prev_engagement_rate > 0 else 0
        reactions_trend = ((curr_reactions - prev_reactions) / prev_reactions * 100) if prev_reactions > 0 else 0
        comments_trend = ((curr_comments - prev_comments) / prev_comments * 100) if prev_comments > 0 else 0

        kpis = {
            "totalPosts": total_posts,
            "totalImpressions": int(total_impressions),
            "avgEngagementRate": avg_engagement_rate,
            "totalReactions": int(total_reactions),
            "totalComments": int(total_comments),
            "trends": {
                "posts": round(posts_trend, 2),
                "impressions": round(impressions_trend, 2),
                "engagementRate": round(engagement_rate_trend, 2),
                "reactions": round(reactions_trend, 2),
                "comments": round(comments_trend, 2)
            }
        }

        # --- Engagement Over Time (group by week/month) ---
        df['post_date'] = pd.to_datetime(df['post_date'])
        df_sorted = df.sort_values('post_date')
        
        # Group by week and calculate totals
        df_sorted['week'] = df_sorted['post_date'].dt.to_period('W').astype(str)
        engagement_over_time = df_sorted.groupby('week').agg({
            'likes': 'sum',
            'comments': 'sum',
            'shares': 'sum'
        }).reset_index()
        
        # Take last 10 weeks
        engagement_over_time = engagement_over_time.tail(10)
        engagement_over_time_list = engagement_over_time.rename(columns={'week': 'date'}).to_dict(orient='records')

        # --- Top Posts by Engagement ---
        df['total_engagement'] = df['likes'] + df['comments'] + df['shares']
        top_posts_df = df.nlargest(10, 'total_engagement')[['content', 'impressions', 'likes', 'comments', 'shares']]
        
        # Truncate content for display
        top_posts_df['post'] = top_posts_df['content'].str[:30] + '...'
        top_posts_list = top_posts_df[['post', 'impressions', 'likes', 'comments', 'shares']].to_dict(orient='records')

        # --- Sentiment Analysis (simplified - based on engagement rate) ---
        df['engagement_rate'] = ((df['likes'] + df['comments'] + df['shares']) / df['impressions']) * 100
        
        # Classify posts as positive/neutral/negative based on engagement rate
        positive_count = len(df[df['engagement_rate'] > 5])  # > 5% is positive
        neutral_count = len(df[(df['engagement_rate'] >= 2) & (df['engagement_rate'] <= 5)])  # 2-5% is neutral
        negative_count = len(df[df['engagement_rate'] < 2])  # < 2% is negative
        
        total_for_sentiment = positive_count + neutral_count + negative_count
        sentiment_data = [
            {
                "name": "Positive",
                "value": round((positive_count / total_for_sentiment * 100), 0) if total_for_sentiment > 0 else 0,
                "color": "#22c55e"
            },
            {
                "name": "Neutral",
                "value": round((neutral_count / total_for_sentiment * 100), 0) if total_for_sentiment > 0 else 0,
                "color": "#94a3b8"
            },
            {
                "name": "Negative",
                "value": round((negative_count / total_for_sentiment * 100), 0) if total_for_sentiment > 0 else 0,
                "color": "#ef4444"
            }
        ]

        # --- Word Cloud Data (extract common words from content) ---
        from collections import Counter
        import re
        
        all_content = ' '.join(df['content'].astype(str))
        # Remove common words and extract meaningful terms
        words = re.findall(r'\b[a-zA-Z]{4,}\b', all_content.lower())
        # Filter out common stop words
        stop_words = {'about', 'this', 'that', 'with', 'from', 'have', 'post', 'insightful', 'topic'}
        filtered_words = [word for word in words if word not in stop_words]
        
        # Get top 20 words
        word_counts = Counter(filtered_words).most_common(20)
        word_cloud_data = [{"text": word, "value": count} for word, count in word_counts]

        # --- Full Payload ---
        summary = {
            "kpis": kpis,
            "engagementOverTime": engagement_over_time_list,
            "topPosts": top_posts_list,
            "sentimentData": sentiment_data,
            "wordCloudData": word_cloud_data,
            "rawPosts": df.to_dict(orient="records")
        }
        
        return summary

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/linkedin/nlp")
def get_linkedin_nlp():
    """
    Performs NLP analysis on LinkedIn posts data including:
    - Sentiment analysis on simulated comments using TextBlob
    - Word frequency analysis on post content using WordCloud
    """
    try:
        if not os.path.exists(linkedin_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {linkedin_csv_path}"
            )

        df = pd.read_csv(linkedin_csv_path)
        
        if df.empty:
            return {
                "sentiment": {
                    "positive": 0,
                    "neutral": 0,
                    "negative": 0
                },
                "wordCloud": []
            }

        # --- Sentiment Analysis on Simulated Comments ---
        # Since 'comments' column is numeric, we'll simulate comment text
        # based on the engagement metrics for proof-of-concept
        
        positive_templates = [
            "Great post! Very insightful.",
            "Love this content, thanks for sharing!",
            "Excellent insights, really helpful.",
            "Amazing perspective on this topic!",
            "This is exactly what I needed to know."
        ]
        
        neutral_templates = [
            "Thanks for the information.",
            "Interesting perspective.",
            "Good to know about this.",
            "I see your point.",
            "Worth considering."
        ]
        
        negative_templates = [
            "I disagree with this approach.",
            "Not sure I follow this logic.",
            "This could be improved.",
            "Questionable take on this.",
            "I have concerns about this."
        ]
        
        simulated_comments = []
        
        for _, row in df.iterrows():
            # Calculate engagement rate to determine sentiment distribution
            total_engagement = row['likes'] + row['comments'] + row['shares']
            engagement_rate = (total_engagement / row['impressions']) * 100 if row['impressions'] > 0 else 0
            
            # Number of comments to simulate (use the numeric comments value)
            num_comments = int(row['comments']) if pd.notna(row['comments']) else 0
            
            # Distribute comments based on engagement rate
            if engagement_rate > 5:  # High engagement - more positive
                positive_ratio = 0.7
                neutral_ratio = 0.2
                negative_ratio = 0.1
            elif engagement_rate >= 2:  # Medium engagement
                positive_ratio = 0.5
                neutral_ratio = 0.4
                negative_ratio = 0.1
            else:  # Low engagement - more negative
                positive_ratio = 0.3
                neutral_ratio = 0.4
                negative_ratio = 0.3
            
            # Generate simulated comments
            for _ in range(min(num_comments, 5)):  # Limit to 5 per post for performance
                rand_val = random.random()
                if rand_val < positive_ratio:
                    simulated_comments.append(random.choice(positive_templates))
                elif rand_val < positive_ratio + neutral_ratio:
                    simulated_comments.append(random.choice(neutral_templates))
                else:
                    simulated_comments.append(random.choice(negative_templates))
        
        # Perform sentiment analysis using TextBlob
        positive_count = 0
        neutral_count = 0
        negative_count = 0
        
        for comment in simulated_comments:
            analysis = TextBlob(comment)
            polarity = analysis.sentiment.polarity
            
            if polarity > 0.1:
                positive_count += 1
            elif polarity < -0.1:
                negative_count += 1
            else:
                neutral_count += 1
        
        sentiment_result = {
            "positive": positive_count,
            "neutral": neutral_count,
            "negative": negative_count
        }
        
        # --- Word Cloud Analysis on Post Content ---
        # Combine all post content
        all_content = ' '.join(df['content'].astype(str).tolist())
        
        # Generate word cloud
        wordcloud = WordCloud(
            width=800,
            height=400,
            background_color='white',
            max_words=50,
            collocations=False,  # Prevent phrase generation
            min_word_length=2,   # Minimum word length
            stopwords=set(['about', 'this', 'that', 'with', 'from', 'have', 'post', 
                          'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 
                          'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get'])
        ).generate(all_content)
        
        # Extract word frequencies
        word_freq = wordcloud.words_
        
        # Convert to list of dictionaries sorted by value
        word_cloud_data = [
            {"text": word, "value": int(freq * 100)} 
            for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        ]
        
        # Return top 50
        word_cloud_data = word_cloud_data[:50]
        
        return {
            "sentiment": sentiment_result,
            "wordCloud": word_cloud_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/blog/posts")
def get_blog_posts():
    """
    Reads blog posts data from a CSV file and returns it as a JSON array.
    """
    try:
        if not os.path.exists(blog_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {blog_csv_path}"
            )

        df = pd.read_csv(blog_csv_path)
        
        if df.empty:
            return []

        # Convert the DataFrame to a list of dictionaries
        data = df.to_dict(orient="records")
        return data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/blog/summary")
def get_blog_summary():
    """
    Reads and processes blog posts data to return a full summary
    including KPIs, trends, and analytics.
    """
    try:
        if not os.path.exists(blog_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {blog_csv_path}"
            )

        df = pd.read_csv(blog_csv_path)
        
        if df.empty:
            return {
                "kpis": {},
                "viewsOverTime": [],
                "topArticles": [],
                "rawPosts": []
            }

        # --- KPI Calculations ---
        total_posts = len(df)
        total_views = df['views'].sum()
        total_comments = df['comments'].sum()
        total_shares = df['shares'].sum()
        total_clicks = df['clicks'].sum()
        
        avg_views_per_post = total_views / total_posts if total_posts > 0 else 0

        # --- Trend Calculations (Current vs Previous Period) ---
        # Split data into two halves for trend comparison
        mid_point = len(df) // 2
        
        # Previous period (first half)
        prev_df = df.iloc[:mid_point]
        prev_views = prev_df['views'].sum()
        prev_comments = prev_df['comments'].sum()
        prev_shares = prev_df['shares'].sum()
        prev_clicks = prev_df['clicks'].sum()
        prev_avg_views = prev_views / len(prev_df) if len(prev_df) > 0 else 0
        
        # Current period (second half)
        curr_df = df.iloc[mid_point:]
        curr_views = curr_df['views'].sum()
        curr_comments = curr_df['comments'].sum()
        curr_shares = curr_df['shares'].sum()
        curr_clicks = curr_df['clicks'].sum()
        curr_avg_views = curr_views / len(curr_df) if len(curr_df) > 0 else 0
        
        # Calculate percentage change
        views_trend = ((curr_views - prev_views) / prev_views * 100) if prev_views > 0 else 0
        avg_views_trend = ((curr_avg_views - prev_avg_views) / prev_avg_views * 100) if prev_avg_views > 0 else 0
        comments_trend = ((curr_comments - prev_comments) / prev_comments * 100) if prev_comments > 0 else 0
        shares_trend = ((curr_shares - prev_shares) / prev_shares * 100) if prev_shares > 0 else 0

        kpis = {
            "totalPosts": total_posts,
            "totalViews": int(total_views),
            "avgViewsPerPost": round(avg_views_per_post, 0),
            "totalComments": int(total_comments),
            "totalShares": int(total_shares),
            "totalClicks": int(total_clicks),
            "trends": {
                "views": round(views_trend, 2),
                "avgViews": round(avg_views_trend, 2),
                "comments": round(comments_trend, 2),
                "shares": round(shares_trend, 2)
            }
        }

        # --- Views Over Time (group by month) ---
        df['publish_date'] = pd.to_datetime(df['publish_date'])
        df_sorted = df.sort_values('publish_date')
        
        # Group by month and calculate totals
        df_sorted['month'] = df_sorted['publish_date'].dt.strftime('%b')
        views_over_time = df_sorted.groupby('month', sort=False).agg({
            'views': 'sum'
        }).reset_index()
        
        views_over_time_list = views_over_time.to_dict(orient='records')

        # --- Top Articles by Views ---
        top_articles_df = df.nlargest(10, 'views')[['title', 'views', 'comments', 'shares', 'clicks']]
        top_articles_list = top_articles_df.to_dict(orient='records')

        # --- Full Payload ---
        summary = {
            "kpis": kpis,
            "viewsOverTime": views_over_time_list,
            "topArticles": top_articles_list,
            "rawPosts": df.to_dict(orient="records")
        }
        
        return summary

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/seo/metrics")
def get_seo_metrics():
    """
    Reads SEO metrics data from a CSV file and returns it as a JSON array.
    """
    try:
        if not os.path.exists(seo_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {seo_csv_path}"
            )

        df = pd.read_csv(seo_csv_path)
        
        if df.empty:
            return []

        # Convert the DataFrame to a list of dictionaries
        data = df.to_dict(orient="records")
        return data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/seo/summary")
def get_seo_summary():
    """
    Reads and processes SEO metrics data to return a full summary
    including KPIs, trends, and analytics.
    """
    try:
        if not os.path.exists(seo_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {seo_csv_path}"
            )

        df = pd.read_csv(seo_csv_path)
        
        if df.empty:
            return {
                "kpis": {},
                "rawMetrics": []
            }

        # --- KPI Calculations ---
        total_clicks = int(df['clicks'].sum())
        average_position = float(df['rank'].mean())
        total_impressions = int(df['impressions'].sum())
        average_ctr = float(df['ctr'].mean() * 100)  # Convert to percentage
        unique_keywords = df['keyword'].nunique()

        # --- Trend Calculations (Current vs Previous Period) ---
        # Split data into two halves for trend comparison
        mid_point = len(df) // 2
        
        # Previous period (first half)
        prev_df = df.iloc[:mid_point]
        prev_clicks = prev_df['clicks'].sum()
        prev_position = prev_df['rank'].mean()
        prev_impressions = prev_df['impressions'].sum()
        prev_ctr = prev_df['ctr'].mean() * 100
        
        # Current period (second half)
        curr_df = df.iloc[mid_point:]
        curr_clicks = curr_df['clicks'].sum()
        curr_position = curr_df['rank'].mean()
        curr_impressions = curr_df['impressions'].sum()
        curr_ctr = curr_df['ctr'].mean() * 100
        
        # Calculate percentage change
        clicks_trend = ((curr_clicks - prev_clicks) / prev_clicks * 100) if prev_clicks > 0 else 0
        # For position, lower is better, so we invert the trend
        position_trend = -((curr_position - prev_position) / prev_position * 100) if prev_position > 0 else 0
        impressions_trend = ((curr_impressions - prev_impressions) / prev_impressions * 100) if prev_impressions > 0 else 0
        ctr_trend = ((curr_ctr - prev_ctr) / prev_ctr * 100) if prev_ctr > 0 else 0

        kpis = {
            "totalClicks": total_clicks,
            "averagePosition": round(average_position, 1),
            "totalImpressions": total_impressions,
            "averageCTR": round(average_ctr, 2),
            "keywordsRanked": unique_keywords,
            "trends": {
                "clicks": round(clicks_trend, 2),
                "position": round(position_trend, 2),
                "impressions": round(impressions_trend, 2),
                "ctr": round(ctr_trend, 2)
            }
        }

        # --- Full Payload ---
        summary = {
            "kpis": kpis,
            "rawMetrics": df.to_dict(orient="records")
        }
        
        return summary

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/web/analytics")
def get_web_analytics():
    """
    Reads web analytics data from a CSV file and returns it as a JSON array.
    """
    try:
        if not os.path.exists(web_analytics_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {web_analytics_csv_path}"
            )

        df = pd.read_csv(web_analytics_csv_path)
        
        if df.empty:
            return []

        # Convert the DataFrame to a list of dictionaries
        data = df.to_dict(orient="records")
        return data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/web/summary")
def get_web_summary():
    """
    Reads and processes web analytics data to return a full summary
    including KPIs and analytics.
    """
    try:
        if not os.path.exists(web_analytics_csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found. Path checked: {web_analytics_csv_path}"
            )

        df = pd.read_csv(web_analytics_csv_path)
        
        if df.empty:
            return {
                "kpis": {},
                "rawAnalytics": []
            }

        # --- KPI Calculations ---
        total_page_views = int(df['page_views'].sum())
        total_unique_visitors = int(df['unique_visitors'].sum())
        
        # Average bounce rate (bounce_rate is already a decimal, e.g., 0.603)
        average_bounce_rate = float(df['bounce_rate'].mean() * 100)  # Convert to percentage
        
        # Average session duration in seconds
        average_session_duration_seconds = float(df['avg_session_duration'].mean())
        
        # Convert to minutes:seconds format
        minutes = int(average_session_duration_seconds // 60)
        seconds = int(average_session_duration_seconds % 60)
        formatted_session_duration = f"{minutes}:{seconds:02d}"

        # --- Additional Calculated Metrics ---
        # Pages per Session (total page views / total unique visitors)
        pages_per_session = (total_page_views / total_unique_visitors) if total_unique_visitors > 0 else 0

        # --- Trend Calculations (Current vs Previous Period) ---
        # Split data into two halves for trend comparison
        mid_point = len(df) // 2
        
        # Previous period (first half)
        prev_df = df.iloc[:mid_point]
        prev_page_views = prev_df['page_views'].sum()
        prev_unique_visitors = prev_df['unique_visitors'].sum()
        prev_bounce_rate = prev_df['bounce_rate'].mean() * 100
        prev_session_duration = prev_df['avg_session_duration'].mean()
        prev_pages_per_session = (prev_page_views / prev_unique_visitors) if prev_unique_visitors > 0 else 0
        
        # Current period (second half)
        curr_df = df.iloc[mid_point:]
        curr_page_views = curr_df['page_views'].sum()
        curr_unique_visitors = curr_df['unique_visitors'].sum()
        curr_bounce_rate = curr_df['bounce_rate'].mean() * 100
        curr_session_duration = curr_df['avg_session_duration'].mean()
        curr_pages_per_session = (curr_page_views / curr_unique_visitors) if curr_unique_visitors > 0 else 0
        
        # Calculate percentage change
        page_views_trend = ((curr_page_views - prev_page_views) / prev_page_views * 100) if prev_page_views > 0 else 0
        bounce_rate_trend = ((curr_bounce_rate - prev_bounce_rate) / prev_bounce_rate * 100) if prev_bounce_rate > 0 else 0
        session_duration_trend = ((curr_session_duration - prev_session_duration) / prev_session_duration * 100) if prev_session_duration > 0 else 0
        pages_per_session_trend = ((curr_pages_per_session - prev_pages_per_session) / prev_pages_per_session * 100) if prev_pages_per_session > 0 else 0

        kpis = {
            "totalPageViews": total_page_views,
            "totalUniqueVisitors": total_unique_visitors,
            "averageBounceRate": round(average_bounce_rate, 1),
            "averageSessionDuration": round(average_session_duration_seconds, 2),
            "formattedSessionDuration": formatted_session_duration,
            "pagesPerSession": round(pages_per_session, 1),
            "trends": {
                "pageViews": round(page_views_trend, 2),
                "bounceRate": round(bounce_rate_trend, 2),
                "sessionDuration": round(session_duration_trend, 2),
                "pagesPerSession": round(pages_per_session_trend, 2)
            }
        }

        # --- Full Payload ---
        summary = {
            "kpis": kpis,
            "rawAnalytics": df.to_dict(orient="records")
        }
        
        return summary

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

@app.get("/api/overview")
def get_overview():
    """
    Reads and processes all data sources to return a comprehensive overview
    including unified KPIs, funnel data, source mix, and feature importances.
    """
    try:
        # --- Load all 5 data sources ---
        # Email campaigns
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail=f"Email data file not found: {csv_path}")
        email_df = pd.read_csv(csv_path)
        
        # LinkedIn posts
        if not os.path.exists(linkedin_csv_path):
            raise HTTPException(status_code=404, detail=f"LinkedIn data file not found: {linkedin_csv_path}")
        linkedin_df = pd.read_csv(linkedin_csv_path)
        
        # Blog posts
        if not os.path.exists(blog_csv_path):
            raise HTTPException(status_code=404, detail=f"Blog data file not found: {blog_csv_path}")
        blog_df = pd.read_csv(blog_csv_path)
        
        # Web analytics
        if not os.path.exists(web_analytics_csv_path):
            raise HTTPException(status_code=404, detail=f"Web analytics data file not found: {web_analytics_csv_path}")
        web_df = pd.read_csv(web_analytics_csv_path)
        
        # SEO metrics
        if not os.path.exists(seo_csv_path):
            raise HTTPException(status_code=404, detail=f"SEO data file not found: {seo_csv_path}")
        seo_df = pd.read_csv(seo_csv_path)
        
        # --- Create unified master_df ---
        # Prepare web analytics (already has date column)
        web_df['date'] = pd.to_datetime(web_df['date'])
        web_daily = web_df.groupby('date').agg({
            'page_views': 'sum',
            'unique_visitors': 'sum',
            'bounce_rate': 'mean',
            'avg_session_duration': 'mean'
        }).reset_index()
        
        # Prepare email campaigns (use send_date)
        email_df['send_date'] = pd.to_datetime(email_df['send_date'])
        email_daily = email_df.groupby('send_date').agg({
            'clicks': 'sum',
            'opens': 'sum',
            'sends': 'sum'
        }).reset_index()
        email_daily.rename(columns={'send_date': 'date', 'clicks': 'email_clicks'}, inplace=True)
        
        # Prepare LinkedIn posts (use post_date)
        linkedin_df['post_date'] = pd.to_datetime(linkedin_df['post_date'])
        linkedin_daily = linkedin_df.groupby('post_date').agg({
            'impressions': 'sum',
            'likes': 'sum',
            'comments': 'sum',
            'shares': 'sum'
        }).reset_index()
        linkedin_daily.rename(columns={'post_date': 'date'}, inplace=True)
        linkedin_daily['linkedin_engagement'] = linkedin_daily['likes'] + linkedin_daily['comments'] + linkedin_daily['shares']
        
        # Prepare blog posts (use publish_date)
        blog_df['publish_date'] = pd.to_datetime(blog_df['publish_date'])
        blog_daily = blog_df.groupby('publish_date').agg({
            'views': 'sum',
            'comments': 'sum',
            'shares': 'sum'
        }).reset_index()
        blog_daily.rename(columns={'publish_date': 'date', 'views': 'blog_views'}, inplace=True)
        blog_daily['blog_engagement'] = blog_daily['comments'] + blog_daily['shares']
        
        # Prepare SEO metrics (use date)
        seo_df['date'] = pd.to_datetime(seo_df['date'])
        seo_daily = seo_df.groupby('date').agg({
            'clicks': 'sum',
            'impressions': 'sum',
            'rank': 'mean'
        }).reset_index()
        seo_daily.rename(columns={'clicks': 'seo_clicks', 'impressions': 'seo_impressions'}, inplace=True)
        
        # Merge all data sources into master_df
        master_df = web_daily.copy()
        master_df = master_df.merge(email_daily[['date', 'email_clicks', 'opens', 'sends']], on='date', how='outer')
        master_df = master_df.merge(linkedin_daily[['date', 'impressions', 'linkedin_engagement']], on='date', how='outer')
        master_df = master_df.merge(blog_daily[['date', 'blog_views', 'blog_engagement']], on='date', how='outer')
        master_df = master_df.merge(seo_daily[['date', 'seo_clicks', 'seo_impressions']], on='date', how='outer')
        
        # Fill NaN values with 0
        master_df = master_df.fillna(0)
        
        # Sort by date
        master_df = master_df.sort_values('date')
        
        # Calculate total social engagement (LinkedIn + Blog)
        master_df['total_social_engagement'] = master_df['linkedin_engagement'] + master_df['blog_engagement']
        
        # --- Calculate KPIs ---
        total_unique_visitors = int(master_df['unique_visitors'].sum())
        total_social_engagement = int(master_df['total_social_engagement'].sum())
        total_email_clicks = int(master_df['email_clicks'].sum())
        total_seo_clicks = int(master_df['seo_clicks'].sum())
        
        kpis = {
            "totalUniqueVisitors": total_unique_visitors,
            "totalSocialEngagement": total_social_engagement,
            "totalEmailClicks": total_email_clicks,
            "totalSeoClicks": total_seo_clicks
        }
        
        # --- Calculate Funnel Data ---
        # Funnel stages: Awareness -> Engagement -> Traffic -> Visitors
        total_impressions = int(master_df['impressions'].sum() + master_df['seo_impressions'].sum())
        total_traffic = total_email_clicks + total_seo_clicks
        
        funnel_data = [
            {
                "stage": "Awareness",
                "value": total_impressions,
                "color": "#14b8a6",
                "description": "Total impressions across all channels"
            },
            {
                "stage": "Engagement",
                "value": total_social_engagement,
                "color": "#a855f7",
                "description": "Likes, comments, shares on social media"
            },
            {
                "stage": "Traffic",
                "value": total_traffic,
                "color": "#f59e0b",
                "description": "Email + SEO clicks"
            },
            {
                "stage": "Visitors",
                "value": total_unique_visitors,
                "color": "#22c55e",
                "description": "Unique website visitors"
            }
        ]
        
        # --- Calculate Source Mix Data (for pie chart) ---
        source_mix_data = [
            {
                "name": "Email Clicks",
                "value": total_email_clicks,
                "color": "#3b82f6"
            },
            {
                "name": "SEO Clicks",
                "value": total_seo_clicks,
                "color": "#14b8a6"
            }
        ]
        
        # --- Calculate Feature Importances (using simplified ML model) ---
        # For this endpoint, we'll calculate basic feature correlations with unique_visitors
        # as a proxy for feature importance
        try:
            from sklearn.ensemble import RandomForestRegressor
            import numpy as np
            
            # Prepare features for modeling
            feature_columns = ['email_clicks', 'total_social_engagement', 'seo_clicks', 
                             'page_views', 'bounce_rate', 'avg_session_duration']
            
            # Filter out rows where unique_visitors is 0
            modeling_df = master_df[master_df['unique_visitors'] > 0].copy()
            
            if len(modeling_df) > 10:  # Need enough data for modeling
                X = modeling_df[feature_columns].fillna(0)
                y = modeling_df['unique_visitors']
                
                # Train a simple Random Forest model
                model = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=5)
                model.fit(X, y)
                
                # Get feature importances
                importances = model.feature_importances_
                
                # Format as list of dictionaries
                feature_importances = [
                    {"feature": "Email Clicks", "importance": float(importances[0])},
                    {"feature": "Social Engagement", "importance": float(importances[1])},
                    {"feature": "SEO Clicks", "importance": float(importances[2])},
                    {"feature": "Page Views", "importance": float(importances[3])},
                    {"feature": "Bounce Rate", "importance": float(importances[4])},
                    {"feature": "Session Duration", "importance": float(importances[5])}
                ]
                
                # Sort by importance (descending)
                feature_importances = sorted(feature_importances, key=lambda x: x['importance'], reverse=True)
            else:
                # Not enough data for modeling - return placeholder
                feature_importances = [
                    {"feature": "Email Clicks", "importance": 0.25},
                    {"feature": "Social Engagement", "importance": 0.20},
                    {"feature": "SEO Clicks", "importance": 0.20},
                    {"feature": "Page Views", "importance": 0.15},
                    {"feature": "Bounce Rate", "importance": 0.10},
                    {"feature": "Session Duration", "importance": 0.10}
                ]
        except Exception as e:
            # If ML fails, return correlation-based importance
            print(f"ML model failed, using correlation: {e}")
            correlations = modeling_df[feature_columns + ['unique_visitors']].corr()['unique_visitors'].abs()
            total_corr = correlations[feature_columns].sum()
            
            feature_importances = [
                {"feature": "Email Clicks", "importance": float(correlations['email_clicks'] / total_corr)},
                {"feature": "Social Engagement", "importance": float(correlations['total_social_engagement'] / total_corr)},
                {"feature": "SEO Clicks", "importance": float(correlations['seo_clicks'] / total_corr)},
                {"feature": "Page Views", "importance": float(correlations['page_views'] / total_corr)},
                {"feature": "Bounce Rate", "importance": float(correlations['bounce_rate'] / total_corr)},
                {"feature": "Session Duration", "importance": float(correlations['avg_session_duration'] / total_corr)}
            ]
            feature_importances = sorted(feature_importances, key=lambda x: x['importance'], reverse=True)
        
        # --- Full Payload ---
        overview = {
            "kpis": kpis,
            "funnelData": funnel_data,
            "sourceMixData": source_mix_data,
            "featureImportances": feature_importances,
            "totalDataPoints": len(master_df)
        }
        
        return overview

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected server error occurred: {str(e)}"
        )

# ========================================
# AI RECOMMENDATIONS ENDPOINT
# ========================================

class RecommendationRequest(BaseModel):
    """Request model for AI recommendations"""
    data_summary: str

class RecommendationResponse(BaseModel):
    """Response model for AI recommendations"""
    channel: str
    recommendations: list[str]
    success: bool
    message: str = ""

# ========================================
# DYNAMIC CSV ANALYSIS MODELS
# ========================================

class DynamicAnalysisResponse(BaseModel):
    """Response model for dynamic CSV analysis"""
    channel_type: str
    file_name: str
    total_records: int
    column_interpretation: Dict[str, Any]
    dashboard_design: Dict[str, Any]
    kpis: Dict[str, Any]
    charts: List[Dict[str, Any]]
    recommendations: List[str]
    success: bool
    message: str

@app.post("/api/recommendations/{channel_type}", response_model=RecommendationResponse, tags=["AI Recommendations"])
async def get_ai_recommendations(
    channel_type: str, 
    request: RecommendationRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate AI-powered recommendations for a specific marketing channel using Google Gemini.
    
    Parameters:
    - channel_type: The marketing channel ('email', 'linkedin', 'blog', 'seo', 'web', 'overview')
    - data_summary: A summary of the channel's performance data
    
    Returns:
    - AI-generated actionable recommendations
    """
    try:
        # Validate channel type
        valid_channels = ['email', 'linkedin', 'blog', 'seo', 'web', 'overview']
        if channel_type.lower() not in valid_channels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid channel type. Must be one of: {', '.join(valid_channels)}"
            )
        
        # Validate data summary
        if not request.data_summary or len(request.data_summary.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="data_summary cannot be empty"
            )
        
        # Call the Gemini API to get recommendations
        recommendations = await get_gemini_recommendations(
            channel_name=channel_type,
            data_summary=request.data_summary
        )
        
        return RecommendationResponse(
            channel=channel_type,
            recommendations=recommendations,
            success=True,
            message=f"Successfully generated {len(recommendations)} recommendations for {channel_type} channel"
        )
    
    except HTTPException as http_exc:
        raise http_exc
    except ValueError as ve:
        raise HTTPException(
            status_code=500,
            detail=f"Configuration error: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )

@app.post("/api/upload/{channel_type}")
async def upload_csv_for_analysis(channel_type: str, file: UploadFile = File(...)):
    """
    Upload a CSV file for on-the-fly analysis based on channel type.
    
    Parameters:
    - channel_type: The type of channel ('email', 'linkedin', 'blog', 'seo', 'web')
    - file: The uploaded CSV file
    
    Returns:
    - JSON object with analysis results based on the channel type
    """
    try:
        # Validate channel type
        valid_channels = ['email', 'linkedin', 'blog', 'seo', 'web']
        if channel_type not in valid_channels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid channel_type '{channel_type}'. Must be one of: {', '.join(valid_channels)}"
            )
        
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only CSV files are accepted."
            )
        
        # Read the uploaded file
        try:
            contents = await file.read()
            csv_string = contents.decode('utf-8')
            df = pd.read_csv(StringIO(csv_string))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse CSV file: {str(e)}"
            )
        
        # Check if DataFrame is empty
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty."
            )
        
        # Perform analysis based on channel type
        analysis_result = {}
        
        if channel_type == 'email':
            # Email campaign analysis
            required_columns = ['sends', 'opens', 'clicks']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns for email analysis: {', '.join(missing_columns)}"
                )
            
            total_sends = int(df['sends'].sum())
            total_opens = int(df['opens'].sum())
            total_clicks = int(df['clicks'].sum())
            avg_open_rate = (total_opens / total_sends * 100) if total_sends > 0 else 0
            avg_ctr = (total_clicks / total_opens * 100) if total_opens > 0 else 0
            
            analysis_result = {
                "channel": "email",
                "totalRecords": len(df),
                "metrics": {
                    "totalSends": total_sends,
                    "totalOpens": total_opens,
                    "totalClicks": total_clicks,
                    "avgOpenRate": round(avg_open_rate, 2),
                    "avgClickThroughRate": round(avg_ctr, 2)
                },
                "columns": list(df.columns)
            }
        
        elif channel_type == 'linkedin':
            # LinkedIn posts analysis
            required_columns = ['impressions', 'likes', 'comments', 'shares']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns for LinkedIn analysis: {', '.join(missing_columns)}"
                )
            
            total_impressions = int(df['impressions'].sum())
            total_likes = int(df['likes'].sum())
            total_comments = int(df['comments'].sum())
            total_shares = int(df['shares'].sum())
            total_engagement = total_likes + total_comments + total_shares
            avg_engagement_rate = (total_engagement / total_impressions * 100) if total_impressions > 0 else 0
            
            analysis_result = {
                "channel": "linkedin",
                "totalRecords": len(df),
                "metrics": {
                    "totalPosts": len(df),
                    "totalImpressions": total_impressions,
                    "totalLikes": total_likes,
                    "totalComments": total_comments,
                    "totalShares": total_shares,
                    "totalEngagement": total_engagement,
                    "avgEngagementRate": round(avg_engagement_rate, 2)
                },
                "columns": list(df.columns)
            }
        
        elif channel_type == 'blog':
            # Blog posts analysis
            required_columns = ['views', 'comments', 'shares']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns for blog analysis: {', '.join(missing_columns)}"
                )
            
            total_views = int(df['views'].sum())
            total_comments = int(df['comments'].sum())
            total_shares = int(df['shares'].sum())
            avg_views = total_views / len(df) if len(df) > 0 else 0
            
            analysis_result = {
                "channel": "blog",
                "totalRecords": len(df),
                "metrics": {
                    "totalPosts": len(df),
                    "totalViews": total_views,
                    "totalComments": total_comments,
                    "totalShares": total_shares,
                    "avgViewsPerPost": round(avg_views, 2)
                },
                "columns": list(df.columns)
            }
        
        elif channel_type == 'seo':
            # SEO metrics analysis
            required_columns = ['clicks', 'impressions', 'rank']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns for SEO analysis: {', '.join(missing_columns)}"
                )
            
            total_clicks = int(df['clicks'].sum())
            total_impressions = int(df['impressions'].sum())
            avg_position = float(df['rank'].mean())
            avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
            
            analysis_result = {
                "channel": "seo",
                "totalRecords": len(df),
                "metrics": {
                    "totalClicks": total_clicks,
                    "totalImpressions": total_impressions,
                    "avgPosition": round(avg_position, 2),
                    "avgCTR": round(avg_ctr, 2)
                },
                "columns": list(df.columns)
            }
        
        elif channel_type == 'web':
            # Web analytics analysis
            required_columns = ['page_views', 'unique_visitors']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns for web analytics: {', '.join(missing_columns)}"
                )
            
            total_page_views = int(df['page_views'].sum())
            total_unique_visitors = int(df['unique_visitors'].sum())
            
            # Optional columns
            avg_bounce_rate = float(df['bounce_rate'].mean() * 100) if 'bounce_rate' in df.columns else None
            avg_session_duration = float(df['avg_session_duration'].mean()) if 'avg_session_duration' in df.columns else None
            
            metrics = {
                "totalPageViews": total_page_views,
                "totalUniqueVisitors": total_unique_visitors
            }
            
            if avg_bounce_rate is not None:
                metrics["avgBounceRate"] = round(avg_bounce_rate, 2)
            if avg_session_duration is not None:
                metrics["avgSessionDuration"] = round(avg_session_duration, 2)
            
            analysis_result = {
                "channel": "web",
                "totalRecords": len(df),
                "metrics": metrics,
                "columns": list(df.columns)
            }
        
        # Add summary statistics
        analysis_result["summary"] = {
            "fileName": file.filename,
            "fileSize": len(contents),
            "uploadedAt": pd.Timestamp.now().isoformat()
        }
        
        return analysis_result
    
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during file upload: {str(e)}"
        )

# ========================================
# ADVANCED MULTI-STEP AI AGENT ENDPOINT
# ========================================

@app.post("/api/upload/dynamic-analysis/{channel_type}", response_model=DynamicAnalysisResponse, tags=["Dynamic AI Analysis"])
async def dynamic_csv_analysis(
    channel_type: str, 
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Advanced Multi-Step AI Agent for Dynamic CSV Analysis
    
    This endpoint orchestrates a sophisticated chain-of-thought analysis:
    1. Data Profiling: Load CSV and extract schema information
    2. AI Step 1: Column Interpretation (Gemini identifies column meanings)
    3. AI Step 2: Dashboard Design (Gemini proposes KPIs and charts)
    4. Data Calculation: Execute the dashboard plan using Pandas
    5. AI Step 3: Generate Recommendations (Gemini creates actionable insights)
    6. Assemble comprehensive JSON response
    
    Args:
        channel_type: Marketing channel (email, linkedin, blog, seo, web, overview)
        file: Uploaded CSV file
        current_user: Authenticated user (JWT protected)
    
    Returns:
        DynamicAnalysisResponse with interpreted schema, KPIs, charts, and recommendations
    """
    print(f"\n{'='*60}")
    print(f"{'='*60}")

    print(f"👤 User: {current_user.username}")
    
    try:
        # Validate channel type
        valid_channels = ['email', 'linkedin', 'blog', 'seo', 'web', 'overview']
        if channel_type not in valid_channels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid channel_type. Must be one of: {', '.join(valid_channels)}"
            )
        
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="Only CSV files are accepted."
            )
        
        # ========================================

        # ========================================
        print(f"\n{'─'*60}")
        print("📥 STEP 1: LOADING CSV AND DATA PROFILING")
        print(f"{'─'*60}")
        
        try:
            contents = await file.read()
            csv_string = contents.decode('utf-8')
            df = pd.read_csv(StringIO(csv_string))
            print(f"✅ CSV loaded successfully: {len(df)} rows, {len(df.columns)} columns")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse CSV: {str(e)}"
            )
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        
        # Get column names and data types
        column_names = df.columns.tolist()
        column_dtypes = {col: str(df[col].dtype) for col in column_names}
        
        # Get statistical summary (first few rows and basic stats)
        sample_data = df.head(3).to_dict('records')
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        stats_summary = {}
        for col in numeric_cols:
            stats_summary[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": float(df[col].mean()),
                "median": float(df[col].median())
            }
        
        print(f"📋 Columns: {', '.join(column_names)}")
        print(f"🔢 Numeric columns: {', '.join(numeric_cols)}")
        
        # ========================================

        # ========================================
        print(f"\n{'─'*60}")
        print("🤖 STEP 2: AI COLUMN INTERPRETATION (Gemini Call #1)")
        print(f"{'─'*60}")
        
        # Configure Gemini API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Create prompt for column interpretation
        interpretation_prompt = f"""
You are an expert data analyst. Analyze the following CSV schema and identify the meaning of each column.

**Channel Type:** {channel_type}

**Column Names and Data Types:**
{json.dumps(column_dtypes, indent=2)}

**Sample Data (first 3 rows):**
{json.dumps(sample_data, indent=2)}

**Your Task:**
Identify the likely meaning and purpose of each column. For each column, determine:
1. What type of metric/dimension it represents (e.g., date, identifier, performance metric, engagement metric)
2. Its business significance for {channel_type} analytics
3. Whether it should be used as a dimension (grouping) or measure (calculation)

**Return ONLY a valid JSON object in this exact format:**
{{
  "columns": {{
    "column_name_1": {{
      "meaning": "Brief description of what this column represents",
      "type": "dimension" or "measure",
      "category": "date", "identifier", "engagement", "performance", "demographic", or "other"
    }},
    "column_name_2": {{ ... }}
  }},
  "primary_date_column": "name of the main date/time column or null",
  "key_metrics": ["list", "of", "important", "metric", "column", "names"]
}}

Do not include any explanatory text, only the JSON object.
"""
        
        try:
            print("🔄 Calling Gemini API for column interpretation...")
            response_1 = model.generate_content(interpretation_prompt)
            interpretation_text = response_1.text.strip()
            
            # Clean the response (remove markdown code blocks if present)
            if interpretation_text.startswith("```json"):
                interpretation_text = interpretation_text.split("```json")[1].split("```")[0].strip()
            elif interpretation_text.startswith("```"):
                interpretation_text = interpretation_text.split("```")[1].split("```")[0].strip()
            
            column_interpretation = json.loads(interpretation_text)
            print(f"📊 Primary date column: {column_interpretation.get('primary_date_column', 'None')}")
            print(f"🎯 Key metrics: {', '.join(column_interpretation.get('key_metrics', []))}")
            
        except json.JSONDecodeError as je:
            # Fallback interpretation
            column_interpretation = {
                "columns": {col: {"meaning": f"{col} data", "type": "measure" if col in numeric_cols else "dimension", "category": "other"} for col in column_names},
                "primary_date_column": None,
                "key_metrics": numeric_cols[:3]
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Column interpretation failed: {str(e)}")
        
        # ========================================

        # ========================================
        print(f"\n{'─'*60}")
        print("🎨 STEP 3: AI DASHBOARD DESIGN (Gemini Call #2)")
        print(f"{'─'*60}")
        
        dashboard_design_prompt = f"""
You are an expert BI dashboard designer. Based on the interpreted data schema below, propose an effective dashboard design.

**Channel Type:** {channel_type}

**Interpreted Schema:**
{json.dumps(column_interpretation, indent=2)}

**Available Columns:**
{', '.join(column_names)}

**Statistical Summary:**
{json.dumps(stats_summary, indent=2)}

**Your Task:**
Design a dashboard with KPIs and visualizations. Propose:
1. **3-4 Key Performance Indicators (KPIs)** - Important single-value metrics
2. **2-3 Charts/Graphs** - Data visualizations with specific chart types

**Return ONLY a valid JSON object in this exact format:**
{{
  "kpis": [
    {{
      "name": "KPI Name",
      "description": "What this KPI shows",
      "calculation": "Describe how to calculate (e.g., 'sum of clicks', 'average of CTR', 'count of posts')",
      "columns_needed": ["column1", "column2"],
      "format": "number", "percentage", "currency", or "duration"
    }}
  ],
  "charts": [
    {{
      "title": "Chart Title",
      "chart_type": "line", "bar", "pie", "area", or "scatter",
      "description": "What this chart shows",
      "x_axis": "column_name or null",
      "y_axis": "column_name or calculation",
      "grouping": "column to group by or null",
      "aggregation": "sum", "average", "count", "max", or "min"
    }}
  ]
}}

Ensure all column names referenced exist in the available columns list.
Do not include any explanatory text, only the JSON object.
"""
        
        try:
            print("🔄 Calling Gemini API for dashboard design...")
            response_2 = model.generate_content(dashboard_design_prompt)
            design_text = response_2.text.strip()
            
            # Clean the response
            if design_text.startswith("```json"):
                design_text = design_text.split("```json")[1].split("```")[0].strip()
            elif design_text.startswith("```"):
                design_text = design_text.split("```")[1].split("```")[0].strip()
            
            dashboard_design = json.loads(design_text)
            print(f"📊 KPIs proposed: {len(dashboard_design.get('kpis', []))}")
            print(f"📈 Charts proposed: {len(dashboard_design.get('charts', []))}")
            
        except json.JSONDecodeError as je:
            # Fallback design
            dashboard_design = {
                "kpis": [
                    {"name": "Total Records", "description": "Total number of records", "calculation": "count", "columns_needed": [], "format": "number"}
                ],
                "charts": [
                    {"title": "Data Overview", "chart_type": "bar", "description": "Overview of data", "x_axis": column_names[0], "y_axis": numeric_cols[0] if numeric_cols else column_names[1], "grouping": None, "aggregation": "sum"}
                ]
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Dashboard design failed: {str(e)}")
        
        # ========================================

        # ========================================
        print(f"\n{'─'*60}")
        print(f"{'─'*60}")
        
        calculated_kpis = {}
        
        # Calculate KPIs
        for kpi in dashboard_design.get('kpis', []):
            kpi_name = kpi['name']
            calculation = kpi['calculation'].lower()
            columns_needed = kpi.get('columns_needed', [])
            
            try:
                # Validate columns exist
                valid_columns = [col for col in columns_needed if col in df.columns]
                
                if 'sum' in calculation and valid_columns:
                    calculated_kpis[kpi_name] = float(df[valid_columns[0]].sum())
                elif 'average' in calculation or 'mean' in calculation and valid_columns:
                    calculated_kpis[kpi_name] = float(df[valid_columns[0]].mean())
                elif 'count' in calculation:
                    calculated_kpis[kpi_name] = len(df)
                elif 'max' in calculation and valid_columns:
                    calculated_kpis[kpi_name] = float(df[valid_columns[0]].max())
                elif 'min' in calculation and valid_columns:
                    calculated_kpis[kpi_name] = float(df[valid_columns[0]].min())
                else:
                    # Try to evaluate as a simple column sum
                    if valid_columns:
                        calculated_kpis[kpi_name] = float(df[valid_columns[0]].sum())
                    else:
                        calculated_kpis[kpi_name] = 0.0
                
                print(f"  ✓ {kpi_name}: {calculated_kpis[kpi_name]}")
                
            except Exception as e:
                calculated_kpis[kpi_name] = 0.0
        
        # Prepare chart data
        prepared_charts = []
        
        for chart in dashboard_design.get('charts', []):
            chart_title = chart['title']
            chart_type = chart['chart_type']
            
            try:
                chart_data = {
                    "title": chart_title,
                    "type": chart_type,
                    "description": chart.get('description', ''),
                    "data": []
                }
                
                x_col = chart.get('x_axis')
                y_col = chart.get('y_axis')
                grouping = chart.get('grouping')
                aggregation = chart.get('aggregation', 'sum')
                
                # Validate columns
                if x_col and x_col in df.columns and y_col and y_col in df.columns:
                    if grouping and grouping in df.columns:
                        # Group by grouping column
                        if aggregation == 'sum':
                            grouped = df.groupby(grouping)[y_col].sum()
                        elif aggregation == 'average' or aggregation == 'mean':
                            grouped = df.groupby(grouping)[y_col].mean()
                        elif aggregation == 'count':
                            grouped = df.groupby(grouping)[y_col].count()
                        else:
                            grouped = df.groupby(grouping)[y_col].sum()
                        
                        chart_data['data'] = [{"label": str(k), "value": float(v)} for k, v in grouped.items()]
                    else:
                        # Take top 10 records
                        top_data = df.nlargest(10, y_col) if y_col in numeric_cols else df.head(10)
                        chart_data['data'] = [
                            {"label": str(row[x_col]), "value": float(row[y_col]) if y_col in numeric_cols else 0}
                            for _, row in top_data.iterrows()
                        ]
                
                prepared_charts.append(chart_data)
                print(f"  ✓ {chart_title}: {len(chart_data['data'])} data points")
                
            except Exception as e:
                print(f"  ✗ Error creating {chart_title}: {str(e)}")
                continue
        
        # Generate AI Recommendations
        print(f"\nGenerating AI Recommendations...")
        print(f"{'─'*60}")
        
        # Build data summary for recommendations
        kpi_summary_parts = [f"{name}: {value}" for name, value in calculated_kpis.items()]
        data_summary = f"""
Channel: {channel_type}
File: {file.filename}
Total Records: {len(df)}

Calculated KPIs:
{chr(10).join(kpi_summary_parts)}

Key Insights:
- Total columns analyzed: {len(column_names)}
- Numeric metrics available: {len(numeric_cols)}
- Charts generated: {len(prepared_charts)}
        """.strip()
        
        try:
            print("🔄 Calling Gemini API for recommendations...")
            recommendations = await get_gemini_recommendations(channel_type, data_summary)
            print(f"✅ Generated {len(recommendations)} recommendations")
            for i, rec in enumerate(recommendations, 1):
                print(f"  {i}. {rec[:80]}...")
            
        except Exception as e:
            recommendations = [
                "Review the data quality and ensure all metrics are being tracked accurately",
                f"Focus on improving the top-performing metrics identified in the {channel_type} channel",
                "Consider A/B testing different strategies based on the insights from this analysis"
            ]
        
        # ========================================

        # ========================================
        print(f"\n{'─'*60}")
        print(f"{'─'*60}")
        
        final_response = DynamicAnalysisResponse(
            channel_type=channel_type,
            file_name=file.filename,
            total_records=len(df),
            column_interpretation=column_interpretation,
            dashboard_design=dashboard_design,
            kpis=calculated_kpis,
            charts=prepared_charts,
            recommendations=recommendations,
            success=True,
            message=f"Successfully analyzed {file.filename} with {len(df)} records using multi-step AI agent"
        )
        print(f"\n{'='*60}")
        print(f"{'='*60}\n")
        
        return final_response
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Dynamic analysis failed: {str(e)}"
        )

# To run this application:
# 1. Navigate to the backend directory:
#    cd /Users/phoenix/Documents/MscProject/ito-a-dashboard/Amit/ITOA_Dashboard/src/backend
# 2. Run the command: uvicorn app:app --reload
