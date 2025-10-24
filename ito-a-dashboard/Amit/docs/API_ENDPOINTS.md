# 📡 FastAPI Backend - API Endpoints Documentation

## Base URL
```
http://127.0.0.1:8000
```

## Available Endpoints

### 1️⃣ Email Campaign Endpoints

#### GET `/api/email/campaigns`
Returns raw email campaign data from CSV.

**Response Example:**
```json
[
  {
    "campaign_id": "CAM_001",
    "campaign_name": "Welcome Series",
    "sends": 1000,
    "opens": 250,
    "clicks": 50,
    "unsubscribe": 5
  }
]
```

#### GET `/api/email/summary`
Returns comprehensive email analytics including KPIs, trends, funnel data, and top campaigns.

**Response Structure:**
```json
{
  "kpis": {
    "avgOpenRate": 25.5,
    "avgCtor": 20.0,
    "unsubscribeRate": 0.5,
    "totalClicks": 1234,
    "trends": {
      "openRate": 5.2,
      "ctor": -2.1,
      "unsubscribeRate": 0.3,
      "totalClicks": 15.7
    }
  },
  "funnelData": [...],
  "topCampaigns": [...],
  "rawCampaigns": [...]
}
```

---

### 2️⃣ LinkedIn Posts Endpoints

#### GET `/api/linkedin/posts`
Returns raw LinkedIn posts data from CSV.

**Response Example:**
```json
[
  {
    "post_id": "LI_001",
    "post_date": "2024-10-15",
    "content": "Insightful post about AI in marketing...",
    "likes": 329,
    "comments": 7,
    "shares": 14,
    "impressions": 11496
  }
]
```

#### GET `/api/linkedin/summary`
Returns comprehensive LinkedIn analytics including KPIs, engagement over time, top posts, sentiment analysis, and word cloud data.

**Response Structure:**
```json
{
  "kpis": {
    "totalPosts": 150,
    "totalImpressions": 1169587,
    "avgEngagementRate": 4.29,
    "totalReactions": 50156,
    "totalComments": 7660,
    "trends": {...}
  },
  "engagementOverTime": [...],
  "topPosts": [...],
  "sentimentData": [...],
  "wordCloudData": [...],
  "rawPosts": [...]
}
```

---

### 3️⃣ Blog Posts Endpoints

#### GET `/api/blog/posts` ⭐ NEW
Returns blog posts data from CSV.

**Response Example:**
```json
[
  {
    "blog_id": "BLOG_001",
    "publish_date": "2024-10-15",
    "title": "The Ultimate Guide to Topic 1",
    "author": "Alice",
    "views": 2190,
    "comments": 77,
    "shares": 36,
    "clicks": 381
  },
  {
    "blog_id": "BLOG_002",
    "publish_date": "2024-11-03",
    "title": "The Ultimate Guide to Topic 2",
    "author": "Alice",
    "views": 7317,
    "comments": 42,
    "shares": 85,
    "clicks": 704
  }
]
```

**CSV Columns:**
- `blog_id`: Unique identifier for the blog post
- `publish_date`: Publication date (YYYY-MM-DD)
- `title`: Blog post title
- `author`: Author name
- `views`: Number of views
- `comments`: Number of comments
- `shares`: Number of shares
- `clicks`: Number of clicks

---

## Testing Endpoints

### Using cURL
```bash
# Email campaigns
curl http://127.0.0.1:8000/api/email/campaigns

# Email summary
curl http://127.0.0.1:8000/api/email/summary

# LinkedIn posts
curl http://127.0.0.1:8000/api/linkedin/posts

# LinkedIn summary
curl http://127.0.0.1:8000/api/linkedin/summary

# Blog posts
curl http://127.0.0.1:8000/api/blog/posts
```

### Using Browser
Simply navigate to:
- http://127.0.0.1:8000/api/blog/posts
- http://127.0.0.1:8000/api/email/summary
- http://127.0.0.1:8000/api/linkedin/summary

---

## Data Files Location
```
src/backend/data/
├── email_campaigns.csv    (Email campaign data)
├── linkedin_posts.csv     (LinkedIn posts data)
└── blog_posts.csv         (Blog posts data)
```

---

## Running the Server

1. Navigate to backend directory:
```bash
cd /Users/phoenix/Documents/MscProject/ito-a-dashboard/Amit/ITOA_Dashboard/src/backend
```

2. Start the server:
```bash
uvicorn app:app --reload
```

3. Server will be available at: `http://127.0.0.1:8000`

---

## CORS Configuration
The API allows requests from any origin (`allow_origins=["*"]`), making it accessible from your frontend at `http://localhost:3000`.

---

## Error Handling
All endpoints include:
- ✅ File existence validation
- ✅ Empty data handling
- ✅ Detailed error messages with HTTP status codes
- ✅ Exception handling for unexpected errors
