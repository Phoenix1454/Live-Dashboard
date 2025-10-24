"""
Test script for the AI Recommendation endpoint
"""
import requests
import json

# Base URL for the API
BASE_URL = "http://127.0.0.1:8000"

# First, login to get a token
def get_auth_token():
    """Login and get authentication token"""
    login_data = {
        "username": "demo",
        "password": "demo123"
    }
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

# Test the recommendations endpoint
def test_recommendations():
    """Test the AI recommendations endpoint"""
    # Get authentication token
    token = get_auth_token()
    if not token:
        return
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Sample data summary for testing
    data_summary = """
    Email Campaign Performance Summary:
    - Total campaigns: 15
    - Average open rate: 24.5%
    - Average click-through rate: 3.2%
    - Best performing campaign: Newsletter #12 (35% open rate)
    - Worst performing campaign: Promo Email #3 (12% open rate)
    - Overall trend: Open rates declining by 5% over last 3 months
    - Bounce rate: 2.1%
    - Unsubscribe rate: 0.8%
    """
    
    request_body = {
        "data_summary": data_summary
    }
    
    # Test different channels
    channels = ["email", "linkedin", "blog"]
    
    for channel in channels:
        print(f"\n{'='*60}")
        print(f"Testing {channel.upper()} channel recommendations...")
        print('='*60)
        
        response = requests.post(
            f"{BASE_URL}/api/recommendations/{channel}",
            headers=headers,
            json=request_body
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nChannel: {result['channel']}")
            print(f"Message: {result['message']}")
            print(f"\nRecommendations:")
            for i, rec in enumerate(result['recommendations'], 1):
                print(f"  {i}. {rec}")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    print("="*60)
    test_recommendations()
    print("\n" + "="*60)
