# 🚀 Dynamic CSV Analysis with Multi-Step AI Agent

## Quick Start

I've created an **advanced AI-powered endpoint** that automatically analyzes any CSV file using a sophisticated 6-step chain-of-thought process with Google Gemini AI.

## 📍 New Endpoint

```
POST /api/upload/dynamic-analysis/{channel_type}
```

**Authentication**: JWT Bearer token required  
**Channels**: `email`, `linkedin`, `blog`, `seo`, `web`, `overview`

## 🧠 How It Works (6 Steps)

1. **📊 Data Profiling**: Loads CSV, extracts schema and statistics
2. **🤖 AI Call #1**: Gemini interprets column meanings and types
3. **🎨 AI Call #2**: Gemini designs KPIs and chart visualizations
4. **🧮 Calculations**: Pandas executes the AI's dashboard plan
5. **💡 AI Call #3**: Gemini generates actionable recommendations
6. **📦 Assembly**: Returns comprehensive JSON with all insights

## 🎯 What You Get

```json
{
  "kpis": {
    "Total Clicks": 15432.0,
    "Average Position": 12.5,
    "Average CTR": 3.42
  },
  "charts": [
    {
      "title": "Clicks Over Time",
      "type": "line",
      "data": [{"label": "2024-01-01", "value": 1250}, ...]
    }
  ],
  "recommendations": [
    "Focus on top-performing keywords with CTR above 3%...",
    "Improve ranking for keywords in positions 10-20..."
  ]
}
```

## 🧪 Testing

### Option 1: Use the Test Script

```bash
cd /Users/phoenix/Documents/MscProject/ito-a-dashboard/Amit
python3 test_dynamic_analysis.py
```

The script will:
- Prompt for your JWT token
- Let you choose which channel to test
- Upload CSV and display results
- Save full response to JSON file

### Option 2: Use cURL

```bash
# Get your token first (from browser localStorage after login)
TOKEN="your_jwt_token_here"

# Test with sample SEO data
curl -X POST "http://127.0.0.1:8000/api/upload/dynamic-analysis/seo" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample_seo_data.csv"
```

### Option 3: Use Postman

1. **URL**: `http://127.0.0.1:8000/api/upload/dynamic-analysis/seo`
2. **Method**: POST
3. **Headers**: `Authorization: Bearer YOUR_TOKEN`
4. **Body**: form-data, key=`file`, type=File, select CSV

## 📁 Files Created

| File | Purpose |
|------|---------|
| `app.py` (updated) | New endpoint implementation |
| `DYNAMIC_AI_ANALYSIS_GUIDE.md` | Complete technical documentation |
| `test_dynamic_analysis.py` | Testing script |
| `sample_seo_data.csv` | Sample data for testing |
| `README_DYNAMIC_ANALYSIS.md` | This quick start guide |

## 🔑 Getting Your Auth Token

1. Log in to dashboard at `http://localhost:3002`
2. Open DevTools (F12) → Console
3. Run: `localStorage.getItem('auth_token')`
4. Copy the token

## 📊 Sample Response Structure

```json
{
  "channel_type": "seo",
  "file_name": "sample_seo_data.csv",
  "total_records": 21,
  "column_interpretation": {
    "columns": {
      "date": {"meaning": "Date of metrics", "type": "dimension", "category": "date"},
      "keyword": {"meaning": "Search keyword", "type": "dimension", "category": "identifier"},
      "rank": {"meaning": "Search ranking position", "type": "measure", "category": "performance"},
      "clicks": {"meaning": "Number of clicks", "type": "measure", "category": "engagement"},
      "impressions": {"meaning": "Times shown in search", "type": "measure", "category": "performance"},
      "ctr": {"meaning": "Click-through rate", "type": "measure", "category": "performance"}
    },
    "primary_date_column": "date",
    "key_metrics": ["clicks", "impressions", "ctr", "rank"]
  },
  "dashboard_design": {
    "kpis": [
      {
        "name": "Total Clicks",
        "description": "Total clicks across all keywords",
        "calculation": "sum of clicks",
        "columns_needed": ["clicks"],
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
      }
    ]
  },
  "kpis": {
    "Total Clicks": 1872.0,
    "Average Position": 7.19,
    "Total Impressions": 69700.0,
    "Average CTR": 2.69
  },
  "charts": [
    {
      "title": "Clicks Over Time",
      "type": "line",
      "data": [
        {"label": "2024-01-01", "value": 259},
        {"label": "2024-01-02", "value": 263},
        {"label": "2024-01-03", "value": 337}
      ]
    },
    {
      "title": "Top Keywords by Clicks",
      "type": "bar",
      "data": [
        {"label": "best crm software", "value": 1218},
        {"label": "crm tools", "value": 600}
      ]
    }
  ],
  "recommendations": [
    "Focus on 'best crm software' keyword - it's ranking #1 with highest clicks (1218 total)",
    "Improve content for keywords ranking 10-15 to capture more clicks",
    "Optimize CTR for underperforming keywords below 2.5% average"
  ],
  "success": true,
  "message": "Successfully analyzed sample_seo_data.csv with 21 records using multi-step AI agent"
}
```

## ⏱️ Performance

- **Total Time**: 8-20 seconds
  - AI Call #1: ~3 seconds
  - AI Call #2: ~4 seconds  
  - AI Call #3: ~3 seconds
  - Calculations: ~1 second

## 🎓 Use Cases

### 1. Upload Unknown CSV
Don't know what's in a CSV? Upload it and AI will:
- Identify all columns
- Propose relevant KPIs
- Design appropriate charts
- Generate insights

### 2. Quick Channel Analysis
Upload campaign data and get instant:
- Performance metrics
- Trend visualizations
- Actionable recommendations

### 3. Ad-Hoc Reporting
No pre-configured dashboard needed:
- AI builds one on-the-fly
- Tailored to your data
- Channel-specific insights

## 🔧 Code Changes

### Added to `app.py`:

1. **New Imports**:
   ```python
   from typing import Dict, Any, List
   import google.generativeai as genai
   ```

2. **New Response Model** (line ~1430):
   ```python
   class DynamicAnalysisResponse(BaseModel):
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
   ```

3. **New Endpoint** (line ~1720-2170):
   - `@app.post("/api/upload/dynamic-analysis/{channel_type}")`
   - 450+ lines of sophisticated AI orchestration
   - 3 Gemini API calls with JSON parsing
   - Pandas calculations
   - Comprehensive error handling

## 📖 Documentation

- **Technical Guide**: `DYNAMIC_AI_ANALYSIS_GUIDE.md` (14,000+ words)
  - Complete API documentation
  - Step-by-step process explanation
  - Error handling
  - Performance tips
  - Future enhancements

- **This Guide**: Quick reference for getting started

## 🚨 Important Notes

1. **Authentication Required**: Endpoint is JWT-protected
2. **Gemini API Key**: Must be set in `.env` file
3. **Rate Limits**: Free tier = 60 requests/minute
4. **Processing Time**: Allow 10-20 seconds per request
5. **CSV Format**: Must be valid CSV with headers

## 🎉 Example Console Output

```
============================================================
🚀 DYNAMIC CSV ANALYSIS STARTED
============================================================
📊 Channel Type: seo
📁 File: sample_seo_data.csv
👤 User: ak1454789@gmail.com

────────────────────────────────────────────────────────────
📥 STEP 1: LOADING CSV AND DATA PROFILING
────────────────────────────────────────────────────────────
✅ CSV loaded: 21 rows, 6 columns

────────────────────────────────────────────────────────────
🤖 STEP 2: AI COLUMN INTERPRETATION (Gemini Call #1)
────────────────────────────────────────────────────────────
✅ Column interpretation complete
📊 Primary date column: date
🎯 Key metrics: clicks, impressions, ctr

────────────────────────────────────────────────────────────
🎨 STEP 3: AI DASHBOARD DESIGN (Gemini Call #2)
────────────────────────────────────────────────────────────
✅ Dashboard design complete
📊 KPIs proposed: 4
📈 Charts proposed: 3

────────────────────────────────────────────────────────────
🧮 STEP 4: EXECUTING DATA CALCULATIONS
────────────────────────────────────────────────────────────
  ✓ Total Clicks: 1872.0
  ✓ Average Position: 7.19
  ✓ Clicks Over Time: 7 data points

────────────────────────────────────────────────────────────
💡 STEP 5: GENERATING AI RECOMMENDATIONS (Gemini Call #3)
────────────────────────────────────────────────────────────
✅ Generated 3 recommendations

============================================================
🎉 DYNAMIC CSV ANALYSIS COMPLETE
============================================================
```

## 🐛 Troubleshooting

### "No authentication token found"
→ Log in to dashboard and get token from localStorage

### "GEMINI_API_KEY not found"
→ Add to `/src/backend/.env`:
```
GEMINI_API_KEY=your_key_here
```

### "Failed to parse CSV"
→ Ensure CSV has headers and is valid UTF-8

### JSON parse errors in AI responses
→ Fallback mechanisms are in place, but check API quota

## 🚀 Next Steps

1. **Test with sample data**:
   ```bash
   python3 test_dynamic_analysis.py
   ```

2. **Try your own CSV files**:
   - Email campaigns
   - LinkedIn posts
   - Blog analytics
   - SEO metrics
   - Web analytics

3. **Integrate with frontend**:
   - Create upload UI component
   - Display KPIs in cards
   - Render charts using Recharts
   - Show recommendations

4. **Extend functionality**:
   - Add caching layer
   - Implement background processing
   - Create downloadable reports
   - Add historical comparison

## 💡 Tips

- **Smaller files first**: Test with <1000 rows initially
- **Clear column names**: Better names = better AI interpretation
- **Include dates**: Date columns enable trend analysis
- **Numeric metrics**: More numbers = more KPIs
- **Check quota**: Free Gemini tier has limits

## 📞 Support

Check these if issues arise:
1. Backend console logs (very detailed)
2. `DYNAMIC_AI_ANALYSIS_GUIDE.md` for deep dive
3. Gemini API status: https://status.cloud.google.com/

---

**Built with ❤️ using FastAPI, Pandas, and Google Gemini AI**

🎯 **Ready to analyze!** Upload any CSV and let AI do the rest.
