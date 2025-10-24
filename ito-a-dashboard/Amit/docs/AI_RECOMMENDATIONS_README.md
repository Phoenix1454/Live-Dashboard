# AI-Powered Recommendations System

## Overview
This AI-powered recommendation system uses **Google Gemini API** to generate actionable marketing insights based on channel performance data.

## Features
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini Pro model for intelligent recommendations
- 📊 **Multi-Channel Support**: Works with email, LinkedIn, blog, SEO, web analytics, and overview data
- 🔒 **Secure**: Requires authentication to access recommendations
- ⚡ **Async Implementation**: Non-blocking API calls for better performance
- 🎯 **Actionable Insights**: Generates 2-3 specific, data-driven recommendations

## Architecture

### Files Created
1. **`recommender.py`**: Core AI recommendation logic
   - Configures Gemini API
   - Constructs marketing analyst prompts
   - Parses and returns recommendations

2. **`app.py`** (updated): FastAPI endpoint implementation
   - POST endpoint: `/api/recommendations/{channel_type}`
   - Request validation
   - Error handling
   - Authentication integration

3. **`test_recommendations.py`**: Test script
   - Automated testing of the recommendations endpoint
   - Sample data for all channels

## API Endpoint

### POST `/api/recommendations/{channel_type}`

Generate AI recommendations for a specific marketing channel.

**Path Parameters:**
- `channel_type`: One of `email`, `linkedin`, `blog`, `seo`, `web`, `overview`

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "data_summary": "Your channel performance data summary here..."
}
```

**Response:**
```json
{
  "channel": "email",
  "recommendations": [
    "First actionable recommendation...",
    "Second actionable recommendation...",
    "Third actionable recommendation..."
  ],
  "success": true,
  "message": "Successfully generated 3 recommendations for email channel"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid channel type or empty data summary
- `401`: Unauthorized (missing or invalid token)
- `500`: Server error (API configuration or Gemini API issues)

## Setup Instructions

### 1. Environment Variables
Ensure your `.env` file contains:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Install Dependencies
```bash
cd src/backend
pip install -r requirements.txt
```

### 3. Start the Backend Server
```bash
python3 -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

### 4. Test the Endpoint
```bash
python test_recommendations.py
```

## Usage Examples

### Example 1: Email Campaign Recommendations

**Request:**
```bash
curl -X POST "http://127.0.0.1:8000/api/recommendations/email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data_summary": "Email campaigns: 15 total, 24.5% avg open rate, 3.2% CTR, declining trend"
  }'
```

**Response:**
```json
{
  "channel": "email",
  "recommendations": [
    "Segment your audience based on engagement history and create targeted campaigns for high-engagement subscribers to reverse the declining open rate trend",
    "A/B test subject lines and preview text to improve the 24.5% open rate, focusing on personalization and urgency",
    "Analyze the top-performing campaign elements and apply those patterns to future emails to boost CTR above the current 3.2%"
  ],
  "success": true,
  "message": "Successfully generated 3 recommendations for email channel"
}
```

### Example 2: LinkedIn Performance Recommendations

**Request:**
```python
import requests

token = "your_jwt_token"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

data = {
    "data_summary": """
    LinkedIn Analytics:
    - Total posts: 45
    - Average engagement rate: 2.8%
    - Best post: Product launch (8.5% engagement)
    - Follower growth: +150 this month
    - Comments trending down by 20%
    """
}

response = requests.post(
    "http://127.0.0.1:8000/api/recommendations/linkedin",
    headers=headers,
    json=data
)

print(response.json())
```

## How It Works

### 1. Prompt Engineering
The system creates a detailed prompt for Gemini that:
- Sets the AI as an expert marketing analyst
- Provides channel-specific context
- Includes performance data summary
- Requests 2-3 actionable recommendations
- Specifies output format requirements

### 2. AI Processing
Gemini Pro analyzes the data and generates:
- Specific recommendations based on actual metrics
- Prioritized by potential impact
- Actionable and implementable
- Focused on key metrics (engagement, conversions, ROI)

### 3. Response Parsing
The system:
- Extracts text from Gemini response
- Parses numbered/bulleted lists
- Cleans formatting
- Returns structured list of recommendations

## Error Handling

The system handles various error scenarios:

| Error Type | HTTP Code | Description |
|------------|-----------|-------------|
| Missing API Key | 500 | `GEMINI_API_KEY` not in environment |
| Invalid Channel | 400 | Channel type not in allowed list |
| Empty Summary | 400 | `data_summary` is empty or whitespace |
| API Failure | 500 | Gemini API call failed |
| Parse Error | 500 | Unable to parse AI response |

## Best Practices

### Data Summary Tips
1. **Be Specific**: Include actual numbers and metrics
2. **Show Trends**: Mention if metrics are improving/declining
3. **Highlight Extremes**: Note best and worst performers
4. **Context Matters**: Include timeframes and comparisons
5. **Keep Concise**: 3-5 key metrics work best

### Example Good Summary
```
Blog Performance (Last 3 months):
- Total posts: 24
- Average views: 1,250 per post
- Top post: "AI Marketing Tips" (5,400 views)
- Engagement rate: 4.2% (up from 3.1%)
- Bounce rate: 45% (industry avg: 55%)
- Time on page: 3.5 minutes
```

### Example Poor Summary
```
Blog is doing okay. Some posts are good.
```

## Testing

Run the included test script:
```bash
python test_recommendations.py
```

This will:
1. Authenticate with demo credentials
2. Test recommendations for email, LinkedIn, and blog channels
3. Display the AI-generated recommendations
4. Show success/failure status

## Integration with Frontend

### React/TypeScript Example
```typescript
// Fetch recommendations
const getRecommendations = async (channel: string, dataSummary: string) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `http://127.0.0.1:8000/api/recommendations/${channel}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data_summary: dataSummary }),
    }
  );
  
  const data = await response.json();
  return data.recommendations;
};

// Usage
const recommendations = await getRecommendations('email', summaryText);
```

## Troubleshooting

### Issue: "GEMINI_API_KEY not found"
**Solution**: Add your Gemini API key to the `.env` file

### Issue: "Failed to generate recommendations"
**Solutions**:
1. Check internet connection
2. Verify API key is valid
3. Check Gemini API quota/limits
4. Review backend logs for specific error

### Issue: Empty recommendations returned
**Solution**: Ensure `data_summary` contains meaningful data with metrics

### Issue: 401 Unauthorized
**Solution**: Ensure you're sending a valid JWT token in the Authorization header

## Limitations

- Requires active internet connection
- Subject to Google Gemini API rate limits
- Response time depends on API latency (typically 2-5 seconds)
- Maximum 3 recommendations per request
- Requires valid authentication token

## Future Enhancements

Possible improvements:
- [ ] Cache recommendations for identical summaries
- [ ] Support for multiple languages
- [ ] Custom recommendation count
- [ ] Recommendation confidence scores
- [ ] Historical recommendation tracking
- [ ] A/B testing for recommendation quality
- [ ] Integration with other AI models (OpenAI, Claude)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs: `tail -f backend.log`
3. Test with `test_recommendations.py`
4. Verify `.env` configuration

## License

Part of the ItoA Analytics Dashboard project.
