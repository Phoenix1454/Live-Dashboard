# Dynamic AI Analysis Endpoint - Complete Guide

## 🚀 Overview

The **Dynamic CSV Analysis Endpoint** is an advanced multi-step AI agent that automatically analyzes uploaded CSV files using Google Gemini AI. It implements a sophisticated "chain of thought" approach with **6 distinct steps** to provide comprehensive insights.

## 📋 Endpoint Details

### **Endpoint**
```
POST /api/upload/dynamic-analysis/{channel_type}
```

### **Authentication**
🔒 **JWT Protected** - Requires Bearer token in Authorization header

### **Path Parameters**
- `channel_type` (string, required): One of: `email`, `linkedin`, `blog`, `seo`, `web`, `overview`

### **Request Body**
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (CSV file upload)

### **Response Model**
```json
{
  "channel_type": "string",
  "file_name": "string",
  "total_records": 0,
  "column_interpretation": {
    "columns": {
      "column_name": {
        "meaning": "string",
        "type": "dimension|measure",
        "category": "string"
      }
    },
    "primary_date_column": "string|null",
    "key_metrics": ["string"]
  },
  "dashboard_design": {
    "kpis": [...],
    "charts": [...]
  },
  "kpis": {
    "KPI Name": 12345.67
  },
  "charts": [
    {
      "title": "string",
      "type": "line|bar|pie|area|scatter",
      "description": "string",
      "data": [
        {"label": "string", "value": 0}
      ]
    }
  ],
  "recommendations": ["string"],
  "success": true,
  "message": "string"
}
```

---

## 🧠 The 6-Step Chain of Thought

### **Step 1: Data Profiling** 📊
**What it does:**
- Loads the CSV file into a Pandas DataFrame
- Extracts column names and data types
- Generates statistical summaries (min, max, mean, median) for numeric columns
- Samples the first 3 rows for context

**Output:**
```python
{
  "column_names": ["date", "clicks", "impressions", "ctr"],
  "column_dtypes": {
    "date": "object",
    "clicks": "int64",
    "impressions": "int64",
    "ctr": "float64"
  },
  "stats_summary": {
    "clicks": {"min": 10, "max": 500, "mean": 150.5, "median": 140}
  }
}
```

---

### **Step 2: Column Interpretation (Gemini AI Call #1)** 🤖

**What it does:**
- Calls Gemini API to act as a **data analyst**
- Sends column names, data types, and sample data
- AI identifies the meaning and purpose of each column
- Classifies columns as dimensions vs measures
- Identifies the primary date column and key metrics

**Gemini Prompt Template:**
```
You are an expert data analyst. Analyze this CSV schema...

Return JSON:
{
  "columns": {
    "column_name": {
      "meaning": "Brief description",
      "type": "dimension|measure",
      "category": "date|identifier|engagement|performance|demographic|other"
    }
  },
  "primary_date_column": "date_column_name",
  "key_metrics": ["metric1", "metric2"]
}
```

**Example AI Response:**
```json
{
  "columns": {
    "date": {
      "meaning": "Campaign date or posting date",
      "type": "dimension",
      "category": "date"
    },
    "clicks": {
      "meaning": "Number of user clicks on content",
      "type": "measure",
      "category": "engagement"
    },
    "impressions": {
      "meaning": "Total times content was displayed",
      "type": "measure",
      "category": "performance"
    },
    "ctr": {
      "meaning": "Click-through rate (clicks/impressions)",
      "type": "measure",
      "category": "performance"
    }
  },
  "primary_date_column": "date",
  "key_metrics": ["clicks", "impressions", "ctr"]
}
```

---

### **Step 3: Dashboard Design (Gemini AI Call #2)** 🎨

**What it does:**
- Calls Gemini API to act as a **BI dashboard designer**
- Provides the interpreted schema from Step 2
- AI proposes 3-4 KPIs (Key Performance Indicators)
- AI suggests 2-3 visualizations with specific chart types
- Specifies calculations, aggregations, and data groupings

**Gemini Prompt Template:**
```
You are an expert BI dashboard designer. Based on this interpreted schema...

Return JSON:
{
  "kpis": [
    {
      "name": "KPI Name",
      "description": "What this shows",
      "calculation": "sum of clicks",
      "columns_needed": ["clicks"],
      "format": "number|percentage|currency|duration"
    }
  ],
  "charts": [
    {
      "title": "Chart Title",
      "chart_type": "line|bar|pie|area|scatter",
      "description": "What this shows",
      "x_axis": "column_name",
      "y_axis": "column_name",
      "grouping": "column_name|null",
      "aggregation": "sum|average|count|max|min"
    }
  ]
}
```

**Example AI Response:**
```json
{
  "kpis": [
    {
      "name": "Total Clicks",
      "description": "Total number of clicks across all campaigns",
      "calculation": "sum of clicks",
      "columns_needed": ["clicks"],
      "format": "number"
    },
    {
      "name": "Average CTR",
      "description": "Average click-through rate",
      "calculation": "average of ctr",
      "columns_needed": ["ctr"],
      "format": "percentage"
    },
    {
      "name": "Total Impressions",
      "description": "Total content impressions",
      "calculation": "sum of impressions",
      "columns_needed": ["impressions"],
      "format": "number"
    }
  ],
  "charts": [
    {
      "title": "Clicks Over Time",
      "chart_type": "line",
      "description": "Trend of clicks by date",
      "x_axis": "date",
      "y_axis": "clicks",
      "grouping": "date",
      "aggregation": "sum"
    },
    {
      "title": "Top Performing Days",
      "chart_type": "bar",
      "description": "Days with highest impressions",
      "x_axis": "date",
      "y_axis": "impressions",
      "grouping": null,
      "aggregation": "sum"
    }
  ]
}
```

---

### **Step 4: Data Calculations** 🧮

**What it does:**
- Executes the dashboard plan using **Pandas**
- Calculates each KPI based on the AI's specifications
- Prepares data for each chart visualization
- Handles aggregations (sum, average, count, max, min)
- Validates column existence and data types

**Calculation Logic:**
```python
# KPI Calculation Examples
if 'sum' in calculation:
    kpi_value = df[column].sum()
elif 'average' in calculation:
    kpi_value = df[column].mean()
elif 'count' in calculation:
    kpi_value = len(df)

# Chart Data Preparation
if grouping:
    grouped = df.groupby(grouping)[y_col].sum()
    chart_data = [{"label": k, "value": v} for k, v in grouped.items()]
```

**Example Output:**
```json
{
  "kpis": {
    "Total Clicks": 15432.0,
    "Average CTR": 3.42,
    "Total Impressions": 451890.0
  },
  "charts": [
    {
      "title": "Clicks Over Time",
      "type": "line",
      "data": [
        {"label": "2024-01-01", "value": 1250},
        {"label": "2024-01-02", "value": 1380},
        {"label": "2024-01-03", "value": 1120}
      ]
    }
  ]
}
```

---

### **Step 5: Generate Recommendations (Gemini AI Call #3)** 💡

**What it does:**
- Uses the existing `recommender.py` function
- Creates a data summary from calculated KPIs
- Calls Gemini API to generate **2-3 actionable recommendations**
- Recommendations are specific to the channel type
- AI references actual data points in its suggestions

**Data Summary Format:**
```
Channel: seo
File: seo_metrics.csv
Total Records: 365

Calculated KPIs:
Total Clicks: 15432.0
Average CTR: 3.42
Total Impressions: 451890.0

Key Insights:
- Total columns analyzed: 8
- Numeric metrics available: 5
- Charts generated: 2
```

**Example Recommendations:**
```json
[
  "Increase content production on high-performing topics. Your average CTR of 3.42% is above industry average (2.5%), indicating strong content relevance.",
  "Focus on improving impressions during low-traffic periods. Analysis shows 40% variance in daily impressions, suggesting opportunities for consistent posting schedules.",
  "Target long-tail keywords more aggressively. Your top-performing content generates 3x more clicks, indicating opportunity in niche targeting."
]
```

---

### **Step 6: Assemble Final Response** 📦

**What it does:**
- Combines all results into a structured JSON response
- Includes column interpretations, dashboard design, calculated KPIs, chart data, and recommendations
- Adds metadata (file name, record count, success status)
- Returns comprehensive analysis in a single API call

---

## 🎯 Use Cases

### **1. Email Campaign Analysis**
Upload: `email_campaigns.csv`
```csv
date,sends,opens,clicks,bounces,unsubscribes
2024-01-01,10000,2500,750,50,10
2024-01-08,12000,3100,920,45,8
```

**AI Will:**
- Identify metrics (sends, opens, clicks, bounces)
- Propose KPIs: Total Sends, Open Rate, CTR, Bounce Rate
- Suggest charts: Opens Over Time, Click Trends
- Generate email-specific recommendations

### **2. LinkedIn Posts Analysis**
Upload: `linkedin_posts.csv`
```csv
post_date,content,likes,comments,shares,impressions
2024-01-01,"Product launch",120,25,15,5000
2024-01-03,"Tips article",85,18,8,3200
```

**AI Will:**
- Identify engagement metrics
- Propose KPIs: Total Engagement, Avg Engagement Rate
- Suggest charts: Engagement by Post, Impressions Trend
- Generate LinkedIn-specific recommendations

### **3. SEO Performance Analysis**
Upload: `seo_metrics.csv`
```csv
keyword,rank,clicks,impressions,ctr
"best crm software",3,1250,45000,2.78
"crm tools",7,890,32000,2.78
```

**AI Will:**
- Identify ranking and click data
- Propose KPIs: Avg Position, Total Clicks, Avg CTR
- Suggest charts: Top Keywords by Clicks, Position Distribution
- Generate SEO-specific recommendations

---

## 🔧 Technical Implementation

### **Key Technologies**
- **FastAPI**: RESTful endpoint with file upload
- **Pandas**: Data manipulation and calculations
- **Google Gemini AI**: 3 separate API calls for intelligence
- **Pydantic**: Type-safe response models
- **JWT Authentication**: Secure access control

### **Error Handling**
```python
try:
    # Step execution
except json.JSONDecodeError:
    # Fallback to default interpretation
except HTTPException:
    # Return structured error response
except Exception as e:
    # Log error, return 500 with details
```

### **Fallback Mechanisms**
- **Column Interpretation Fails**: Uses basic type detection (numeric vs text)
- **Dashboard Design Fails**: Creates default KPI (Total Records) and simple chart
- **Recommendations Fail**: Returns generic best practice suggestions
- **Calculation Errors**: Skips problematic KPIs, logs warnings

---

## 📊 Console Output Example

When the endpoint runs, it produces detailed console logs:

```
============================================================
🚀 DYNAMIC CSV ANALYSIS STARTED
============================================================
📊 Channel Type: seo
📁 File: seo_metrics.csv
👤 User: john@example.com

────────────────────────────────────────────────────────────
📥 STEP 1: LOADING CSV AND DATA PROFILING
────────────────────────────────────────────────────────────
✅ CSV loaded successfully: 365 rows, 6 columns
📋 Columns: date, keyword, rank, clicks, impressions, ctr
🔢 Numeric columns: rank, clicks, impressions, ctr

────────────────────────────────────────────────────────────
🤖 STEP 2: AI COLUMN INTERPRETATION (Gemini Call #1)
────────────────────────────────────────────────────────────
🔄 Calling Gemini API for column interpretation...
✅ Column interpretation complete
📊 Primary date column: date
🎯 Key metrics: clicks, impressions, ctr

────────────────────────────────────────────────────────────
🎨 STEP 3: AI DASHBOARD DESIGN (Gemini Call #2)
────────────────────────────────────────────────────────────
🔄 Calling Gemini API for dashboard design...
✅ Dashboard design complete
📊 KPIs proposed: 4
📈 Charts proposed: 3

────────────────────────────────────────────────────────────
🧮 STEP 4: EXECUTING DATA CALCULATIONS
────────────────────────────────────────────────────────────
  ✓ Total Clicks: 15432.0
  ✓ Average Position: 12.5
  ✓ Total Impressions: 451890.0
  ✓ Average CTR: 3.42
  ✓ Clicks Over Time: 52 data points
  ✓ Top Keywords by Clicks: 10 data points
  ✓ Position Distribution: 8 data points

────────────────────────────────────────────────────────────
💡 STEP 5: GENERATING AI RECOMMENDATIONS (Gemini Call #3)
────────────────────────────────────────────────────────────
🔄 Calling Gemini API for recommendations...
✅ Generated 3 recommendations
  1. Increase content production on high-performing topics...
  2. Focus on improving impressions during low-traffic...
  3. Target long-tail keywords more aggressively...

────────────────────────────────────────────────────────────
📦 STEP 6: ASSEMBLING FINAL RESPONSE
────────────────────────────────────────────────────────────
✅ Response assembled successfully

============================================================
🎉 DYNAMIC CSV ANALYSIS COMPLETE
============================================================
```

---

## 🧪 Testing the Endpoint

### **Using cURL**
```bash
curl -X POST "http://127.0.0.1:8000/api/upload/dynamic-analysis/seo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/data.csv"
```

### **Using Python (requests)**
```python
import requests

url = "http://127.0.0.1:8000/api/upload/dynamic-analysis/email"
headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}
files = {"file": open("email_campaigns.csv", "rb")}

response = requests.post(url, headers=headers, files=files)
result = response.json()

print(f"KPIs: {result['kpis']}")
print(f"Charts: {len(result['charts'])}")
print(f"Recommendations: {result['recommendations']}")
```

### **Using Postman**
1. **Method**: POST
2. **URL**: `http://127.0.0.1:8000/api/upload/dynamic-analysis/{channel_type}`
3. **Headers**: 
   - `Authorization`: `Bearer YOUR_TOKEN`
4. **Body**: 
   - Type: `form-data`
   - Key: `file` (Type: File)
   - Value: Select your CSV file

---

## ⚡ Performance Considerations

### **Processing Time**
- **Step 1** (Data Loading): ~0.5-2 seconds
- **Step 2** (AI Call #1): ~2-5 seconds
- **Step 3** (AI Call #2): ~3-6 seconds
- **Step 4** (Calculations): ~0.5-3 seconds
- **Step 5** (AI Call #3): ~2-4 seconds
- **Step 6** (Assembly): ~0.1 seconds
- **Total**: ~8-20 seconds (depending on file size and API latency)

### **Limitations**
- **File Size**: Recommended max 10MB (~100K rows)
- **Gemini API Rate Limits**: 60 requests/minute (free tier)
- **Memory**: Large files may require server with >2GB RAM
- **Timeout**: No timeout set (requests wait indefinitely)

### **Optimization Tips**
1. **Cache Results**: Store analysis results to avoid re-processing
2. **Async Processing**: Use background tasks for large files
3. **Batch API Calls**: Combine multiple prompts if possible
4. **Data Sampling**: For very large CSVs, analyze a representative sample

---

## 🛡️ Security & Validation

### **Input Validation**
- ✅ Channel type must be in allowed list
- ✅ File must be CSV format
- ✅ File must not be empty
- ✅ Column names referenced by AI must exist

### **Authentication**
- 🔒 JWT token required
- 🔒 User must be active
- 🔒 Token expiry enforced

### **Data Privacy**
- ⚠️ Uploaded CSV data is sent to Google Gemini API
- ⚠️ Data is not stored permanently (in-memory processing only)
- ⚠️ Consider GDPR/privacy implications for sensitive data

---

## 🚨 Error Responses

### **400 Bad Request**
```json
{
  "detail": "Invalid channel_type. Must be one of: email, linkedin, blog, seo, web, overview"
}
```

### **401 Unauthorized**
```json
{
  "detail": "Not authenticated"
}
```

### **500 Internal Server Error**
```json
{
  "detail": "Column interpretation failed: JSON decode error"
}
```

---

## 🔮 Future Enhancements

### **Planned Features**
1. **Caching Layer**: Redis cache for repeated analyses
2. **Historical Tracking**: Store analysis history per user
3. **Comparative Analysis**: Compare multiple CSV uploads
4. **Custom Prompts**: Allow users to customize AI prompts
5. **Export Options**: Generate PDF/Excel reports
6. **Streaming Responses**: Real-time progress updates via WebSocket
7. **Multi-Language Support**: AI responses in different languages
8. **Advanced Visualizations**: Interactive charts with D3.js
9. **Scheduled Analysis**: Automated periodic CSV analysis
10. **Collaboration**: Share analysis results with team members

### **Advanced AI Features**
- **Anomaly Detection**: AI identifies unusual patterns
- **Predictive Analytics**: Forecast future trends
- **Root Cause Analysis**: AI explains performance changes
- **Competitive Benchmarking**: Compare against industry standards
- **Action Plan Generation**: AI creates step-by-step improvement plans

---

## 📚 Related Endpoints

- `POST /api/recommendations/{channel_type}` - Simple recommendations (no file upload)
- `POST /api/upload/{channel_type}` - Basic CSV analysis (legacy)
- `GET /api/{channel}/summary` - Pre-loaded channel summaries

---

## 🤝 Contributing

To extend this endpoint:

1. **Add New Channel Types**: Update `valid_channels` list
2. **Custom Calculations**: Modify Step 4 calculation logic
3. **New Chart Types**: Add support in chart preparation
4. **Enhanced Prompts**: Improve Gemini prompts for better results
5. **Additional AI Calls**: Insert new analysis steps between existing ones

---

## 📞 Support

For issues or questions:
- Check console logs for detailed error messages
- Verify Gemini API key is valid and has quota
- Ensure CSV format matches expected structure
- Test with sample data first

---

## ✅ Summary

The **Dynamic CSV Analysis Endpoint** represents a cutting-edge application of multi-step AI agents in business intelligence. By orchestrating multiple Gemini API calls in a thoughtful sequence, it transforms raw CSV data into actionable insights automatically.

**Key Advantages:**
- 🎯 **Zero Configuration**: Works with any CSV structure
- 🤖 **AI-Powered**: Gemini interprets data intelligently
- 📊 **Complete Analysis**: From schema to recommendations in one call
- 🔒 **Secure**: JWT-protected with proper validation
- 🚀 **Scalable**: Handles multiple channel types
- 📈 **Actionable**: Provides specific, data-driven recommendations

**Perfect For:**
- Marketing teams analyzing campaign performance
- Data analysts exploring new datasets
- Business owners seeking quick insights
- Developers building BI dashboards
- Anyone needing intelligent CSV analysis without manual configuration

---

**Built with ❤️ using FastAPI, Pandas, and Google Gemini AI**
