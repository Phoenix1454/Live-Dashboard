"""
AI-Powered Recommendation Agent using Google Gemini API
"""
import os
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List

# Load environment variables
load_dotenv()

async def get_gemini_recommendations(channel_name: str, data_summary: str) -> List[str]:
    """
    Generate AI-powered marketing recommendations using Google Gemini API.
    
    Args:
        channel_name: The marketing channel (e.g., 'blog', 'email', 'linkedin', 'seo', 'web')
        data_summary: A summary of the channel's performance data
    
    Returns:
        List of 2-3 actionable recommendations as strings
    
    Raises:
        ValueError: If API key is not found
        Exception: If API call fails
    """
    # Load and validate API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
    # Create the generative model (using latest stable Gemini Flash)
    # This always points to the most recent stable Flash model
    model = genai.GenerativeModel('gemini-flash-latest')
    
    # Create a detailed prompt for the AI
    prompt = f"""
You are a world-class marketing analyst advising a small business owner who is not an expert in marketing. Your tone should be encouraging, clear, and direct.

The primary business goal is to increase website traffic and conversions.

**Channel:** {channel_name.upper()}

**Performance Data Summary:**
{data_summary}

**Your Task:**
Based ONLY on the data provided and the primary business goal, provide 2-3 actionable and specific recommendations to improve the {channel_name} channel's performance.

**Requirements:**
1.  Prioritize recommendations by potential impact on the business goal.
2.  Each recommendation must be concise (1-2 sentences).
3.  For each recommendation, you MUST add a "Why:" section that briefly explains your reasoning by referencing a specific data point from the summary.
4.  Do not give generic advice.

**Format:**
Return ONLY the recommendations as a numbered list.
Example format:
1.  [First recommendation]
    - **Why:** [Brief justification referencing a specific data point.]
2.  [Second recommendation]
    - **Why:** [Brief justification referencing a specific data point.]
"""
    
    try:
        # Generate content using Gemini
        response = model.generate_content(prompt)
        
        # Extract the text from the response
        recommendations_text = response.text.strip()
        
        # Parse the response into a list of recommendations
        recommendations = []
        lines = recommendations_text.split('\n')
        
        for line in lines:
            line = line.strip()
            # Skip empty lines
            if not line:
                continue
            
            # Remove numbering (e.g., "1. ", "2. ", "3. ", "- ", "* ")
            cleaned_line = line
            if line[0].isdigit() and '.' in line[:3]:
                # Remove "1. " or "12. " style numbering
                cleaned_line = line.split('.', 1)[1].strip()
            elif line.startswith('- ') or line.startswith('* '):
                # Remove bullet points
                cleaned_line = line[2:].strip()
            
            if cleaned_line:
                recommendations.append(cleaned_line)
        
        # Ensure we have at least 1 recommendation
        if not recommendations:
            recommendations = [
                "Increase content quality and consistency to improve engagement metrics",
                "Analyze top-performing content and replicate successful patterns",
                "Implement A/B testing to optimize conversion rates"
            ]
        
        # Limit to max 3 recommendations
        return recommendations[:3]
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        raise Exception(f"Failed to generate recommendations: {str(e)}")
