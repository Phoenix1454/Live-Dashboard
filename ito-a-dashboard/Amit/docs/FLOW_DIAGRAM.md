# Dynamic CSV Analysis - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER UPLOADS CSV FILE                                │
│                    POST /api/upload/dynamic-analysis/{channel_type}     │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: DATA PROFILING                                          📊     │
├─────────────────────────────────────────────────────────────────────────┤
│  • Load CSV into Pandas DataFrame                                       │
│  • Extract column names: ["date", "clicks", "impressions", "ctr"]       │
│  • Get data types: {clicks: int64, ctr: float64, ...}                   │
│  • Calculate statistics: {clicks: {min: 10, max: 500, mean: 150}}       │
│  • Sample first 3 rows for context                                      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: COLUMN INTERPRETATION (Gemini AI Call #1)              🤖     │
├─────────────────────────────────────────────────────────────────────────┤
│  PROMPT TO GEMINI:                                                      │
│  "You are a data analyst. Analyze this CSV schema..."                   │
│                                                                          │
│  INPUT: Column names, types, sample data                                │
│                                                                          │
│  GEMINI ANALYZES...                                                     │
│                                                                          │
│  OUTPUT (JSON):                                                         │
│  {                                                                       │
│    "columns": {                                                          │
│      "date": {                                                           │
│        "meaning": "Campaign or posting date",                            │
│        "type": "dimension",                                              │
│        "category": "date"                                                │
│      },                                                                  │
│      "clicks": {                                                         │
│        "meaning": "Number of user clicks",                               │
│        "type": "measure",                                                │
│        "category": "engagement"                                          │
│      }                                                                   │
│    },                                                                    │
│    "primary_date_column": "date",                                        │
│    "key_metrics": ["clicks", "impressions", "ctr"]                       │
│  }                                                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: DASHBOARD DESIGN (Gemini AI Call #2)               🎨         │
├─────────────────────────────────────────────────────────────────────────┤
│  PROMPT TO GEMINI:                                                      │
│  "You are a BI dashboard designer. Based on this interpreted schema..." │
│                                                                          │
│  INPUT: Column interpretations from Step 2                              │
│                                                                          │
│  GEMINI DESIGNS...                                                      │
│                                                                          │
│  OUTPUT (JSON):                                                         │
│  {                                                                       │
│    "kpis": [                                                             │
│      {                                                                   │
│        "name": "Total Clicks",                                           │
│        "description": "Sum of all clicks",                               │
│        "calculation": "sum of clicks",                                   │
│        "columns_needed": ["clicks"],                                     │
│        "format": "number"                                                │
│      },                                                                  │
│      {                                                                   │
│        "name": "Average CTR",                                            │
│        "calculation": "average of ctr",                                  │
│        "format": "percentage"                                            │
│      }                                                                   │
│    ],                                                                    │
│    "charts": [                                                           │
│      {                                                                   │
│        "title": "Clicks Over Time",                                      │
│        "chart_type": "line",                                             │
│        "x_axis": "date",                                                 │
│        "y_axis": "clicks",                                               │
│        "grouping": "date",                                               │
│        "aggregation": "sum"                                              │
│      },                                                                  │
│      {                                                                   │
│        "title": "Top Campaigns",                                         │
│        "chart_type": "bar",                                              │
│        "x_axis": "campaign_name",                                        │
│        "y_axis": "clicks"                                                │
│      }                                                                   │
│    ]                                                                     │
│  }                                                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: DATA CALCULATIONS (Pandas Execution)               🧮         │
├─────────────────────────────────────────────────────────────────────────┤
│  EXECUTE THE AI'S PLAN:                                                 │
│                                                                          │
│  KPI Calculations:                                                      │
│  • Total Clicks = df['clicks'].sum() → 15,432                           │
│  • Average CTR = df['ctr'].mean() → 3.42                                │
│  • Total Impressions = df['impressions'].sum() → 451,890                │
│                                                                          │
│  Chart Data Preparation:                                                │
│  • Clicks Over Time:                                                    │
│      grouped = df.groupby('date')['clicks'].sum()                       │
│      → [{"label": "2024-01-01", "value": 1250}, ...]                    │
│                                                                          │
│  • Top Campaigns:                                                       │
│      top_10 = df.nlargest(10, 'clicks')                                 │
│      → [{"label": "Campaign A", "value": 5000}, ...]                    │
│                                                                          │
│  OUTPUT:                                                                │
│  {                                                                       │
│    "kpis": {                                                             │
│      "Total Clicks": 15432.0,                                            │
│      "Average CTR": 3.42                                                 │
│    },                                                                    │
│    "charts": [                                                           │
│      {                                                                   │
│        "title": "Clicks Over Time",                                      │
│        "type": "line",                                                   │
│        "data": [{"label": "2024-01-01", "value": 1250}, ...]            │
│      }                                                                   │
│    ]                                                                     │
│  }                                                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: GENERATE RECOMMENDATIONS (Gemini AI Call #3)       💡         │
├─────────────────────────────────────────────────────────────────────────┤
│  CALL: recommender.py → get_gemini_recommendations()                   │
│                                                                          │
│  PROMPT TO GEMINI:                                                      │
│  "You are a marketing analyst. Based on this data summary..."           │
│                                                                          │
│  INPUT:                                                                 │
│  Channel: seo                                                            │
│  Total Clicks: 15432                                                     │
│  Average CTR: 3.42%                                                      │
│  Total Impressions: 451890                                               │
│                                                                          │
│  GEMINI GENERATES...                                                    │
│                                                                          │
│  OUTPUT (List of strings):                                              │
│  [                                                                       │
│    "Focus on 'best crm software' keyword - it's ranking #1 with         │
│     highest clicks (1218 total). Continue creating content around       │
│     this topic.",                                                        │
│                                                                          │
│    "Improve CTR for keywords ranking 10-15. Your average CTR of 3.42%   │
│     is strong, but these mid-ranking keywords have opportunity for      │
│     better meta descriptions.",                                          │
│                                                                          │
│    "Consider targeting long-tail variations. Analysis shows your        │
│     top-performing content generates 3x more clicks, indicating         │
│     opportunity in niche targeting."                                     │
│  ]                                                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 6: ASSEMBLE FINAL RESPONSE                             📦         │
├─────────────────────────────────────────────────────────────────────────┤
│  COMBINE ALL RESULTS:                                                   │
│                                                                          │
│  {                                                                       │
│    "channel_type": "seo",                                                │
│    "file_name": "sample_seo_data.csv",                                   │
│    "total_records": 21,                                                  │
│                                                                          │
│    "column_interpretation": { ... from Step 2 ... },                    │
│                                                                          │
│    "dashboard_design": { ... from Step 3 ... },                         │
│                                                                          │
│    "kpis": { ... from Step 4 ... },                                     │
│                                                                          │
│    "charts": [ ... from Step 4 ... ],                                   │
│                                                                          │
│    "recommendations": [ ... from Step 5 ... ],                          │
│                                                                          │
│    "success": true,                                                      │
│    "message": "Successfully analyzed sample_seo_data.csv..."             │
│  }                                                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    RETURN COMPREHENSIVE JSON TO USER                    │
│                    Status: 200 OK                                       │
│                    Processing Time: 10-20 seconds                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Timeline Breakdown

```
0s    ┌─────────┐
      │ CSV     │ User uploads file
      │ Upload  │
      └────┬────┘
           │
1s    ┌────▼────┐
      │ Step 1  │ Load CSV, profile data
      │ Profile │
      └────┬────┘
           │
3s    ┌────▼────────┐
      │ Step 2      │ Gemini Call #1
      │ AI Interpret│ (Column meanings)
      └────┬────────┘
           │
8s    ┌────▼────────┐
      │ Step 3      │ Gemini Call #2
      │ AI Design   │ (Dashboard plan)
      └────┬────────┘
           │
14s   ┌────▼────────┐
      │ Step 4      │ Pandas calculations
      │ Calculate   │ (Execute AI's plan)
      └────┬────────┘
           │
16s   ┌────▼────────┐
      │ Step 5      │ Gemini Call #3
      │ AI Recommend│ (Insights)
      └────┬────────┘
           │
20s   ┌────▼────────┐
      │ Step 6      │ Assemble response
      │ Assembly    │
      └────┬────────┘
           │
      ┌────▼────┐
      │ Return  │ JSON response to user
      │ Result  │
      └─────────┘
```

---

## Data Flow Diagram

```
┌─────────────┐
│   CSV File  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│           Pandas DataFrame                   │
│  ┌────────────────────────────────────────┐  │
│  │ date  │ clicks │ impressions │ ctr     │  │
│  ├────────────────────────────────────────┤  │
│  │ 01-01 │  125   │   4500      │ 2.78   │  │
│  │ 01-02 │  142   │   4800      │ 2.96   │  │
│  │ 01-03 │  165   │   5200      │ 3.17   │  │
│  └────────────────────────────────────────┘  │
└──────┬───────────────────────────────────────┘
       │
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Column     │   │  Dashboard  │   │  KPI        │   │  Chart      │
│  Schema     │   │  Design     │   │  Values     │   │  Data       │
├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤
│ date: dim   │   │ KPI: Total  │   │ Total Clicks│   │ Line Chart: │
│ clicks: msr │   │   Clicks    │   │ = 15,432    │   │  [1250,     │
│ ctr: msr    │   │             │   │             │   │   1380, ...]│
└──────┬──────┘   │ Chart: Line │   │ Avg CTR     │   │             │
       │          │   Over Time │   │ = 3.42%     │   │ Bar Chart:  │
       │          └──────┬──────┘   └──────┬──────┘   │  [5000,     │
       │                 │                 │          │   3200, ...]│
       │                 │                 │          └──────┬──────┘
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                 GEMINI AI PROCESSING                               │
│                                                                    │
│  Call #1: Interpret  →  Call #2: Design  →  Call #3: Recommend   │
│                                                                    │
│  "clicks means      "Total Clicks KPI     "Focus on top          │
│   engagement"        should be sum"        performing keywords"  │
└────────────────────────────────────────────┬───────────────────────┘
                                             │
                                             ▼
                               ┌──────────────────────────┐
                               │   FINAL JSON RESPONSE    │
                               │                          │
                               │  • Interpretations       │
                               │  • Dashboard Design      │
                               │  • Calculated KPIs       │
                               │  • Chart Data Arrays     │
                               │  • AI Recommendations    │
                               └──────────────────────────┘
```

---

## Component Interaction

```
┌────────────────────┐
│   FastAPI          │
│   Endpoint         │
└─────────┬──────────┘
          │
          ├─────────────────────────────────────┐
          │                                     │
          ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│   Pandas        │                  │  Google Gemini   │
│   Library       │                  │  API (3 calls)   │
│                 │                  │                  │
│ • Read CSV      │                  │ • Call #1:       │
│ • Profile data  │                  │   Interpret      │
│ • Calculate     │                  │                  │
│ • Aggregate     │                  │ • Call #2:       │
│ • Group by      │                  │   Design         │
└─────────────────┘                  │                  │
                                     │ • Call #3:       │
                                     │   Recommend      │
                                     └──────────────────┘
          │                                     │
          │                                     │
          ▼                                     ▼
┌────────────────────────────────────────────────────────┐
│              recommender.py                            │
│  (Existing AI recommendation function)                 │
│                                                         │
│  • Creates marketing-focused prompts                   │
│  • Calls Gemini with data summary                      │
│  • Parses AI response into list of strings             │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│         DynamicAnalysisResponse                        │
│         (Pydantic Model)                               │
│                                                         │
│  • Validates all fields                                │
│  • Ensures type safety                                 │
│  • Serializes to JSON                                  │
└────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────┐
│ Try Process │
└──────┬──────┘
       │
       ▼
    Success? ────── Yes ──────► Return Result
       │
       No
       │
       ▼
┌──────────────────────────────────────────┐
│  Which Step Failed?                      │
├──────────────────────────────────────────┤
│                                          │
│  Step 2 (AI Interpret):                 │
│    → Use basic type detection           │
│    → Numeric = measure, text = dimension│
│                                          │
│  Step 3 (AI Design):                    │
│    → Create default KPI (Total Records) │
│    → Create simple bar chart            │
│                                          │
│  Step 4 (Calculate):                    │
│    → Skip invalid columns               │
│    → Log warning, continue              │
│                                          │
│  Step 5 (Recommend):                    │
│    → Return generic best practices      │
│                                          │
└────────────┬─────────────────────────────┘
             │
             ▼
      ┌─────────────┐
      │ Log Error   │
      │ Return 500  │
      │ with Detail │
      └─────────────┘
```

---

## Key Decision Points

```
┌────────────────────────────────────────────┐
│  Is CSV valid UTF-8?                       │
└───┬─────────────────────────────┬──────────┘
    │ Yes                          │ No
    ▼                              ▼
Continue                    Return 400 Error


┌────────────────────────────────────────────┐
│  Does CSV have headers?                    │
└───┬─────────────────────────────┬──────────┘
    │ Yes                          │ No
    ▼                              ▼
Continue                    Use Column1, Column2...


┌────────────────────────────────────────────┐
│  Did AI return valid JSON?                 │
└───┬─────────────────────────────┬──────────┘
    │ Yes                          │ No
    ▼                              ▼
Use AI Output               Use Fallback Logic


┌────────────────────────────────────────────┐
│  Do referenced columns exist?              │
└───┬─────────────────────────────┬──────────┘
    │ Yes                          │ No
    ▼                              ▼
Calculate KPI               Skip KPI, Log Warning
```

---

**End of Visual Flow Documentation**

This diagram shows how a simple CSV upload triggers a sophisticated 6-step AI-powered analysis pipeline! 🚀
