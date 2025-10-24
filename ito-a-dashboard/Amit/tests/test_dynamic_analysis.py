"""
Test script for dynamic CSV analysis endpoint
"""

import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"
LOGIN_EMAIL = "ak1454789@gmail.com"
LOGIN_PASSWORD = "your_password"

TEST_FILES = {
    "email": "data/email_campaigns.csv",
    "linkedin": "data/linkedin_posts.csv",
    "blog": "data/blog_posts.csv",
    "seo": "data/seo_metrics_daily.csv",
    "web": "data/web_analytics_daily.csv"
}

def get_auth_token(email: str, password: str) -> str:
    """Authenticate and get JWT token"""
    print("Authenticating...")
    
    response = requests.post(
        f"{BASE_URL}/login",
        data={"username": email, "password": password}
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return token
    else:
        raise Exception("Authentication failed")

def test_dynamic_analysis(channel_type: str, csv_file_path: str, token: str):
    """Test the dynamic CSV analysis endpoint"""
    
    print(f"\nTesting Dynamic Analysis for: {channel_type.upper()}")
    print("=" * 70)
    
    if not os.path.exists(csv_file_path):
        print(f"File not found: {csv_file_path}")
        return
    
    url = f"{BASE_URL}/api/upload/dynamic-analysis/{channel_type}"
    headers = {"Authorization": f"Bearer {token}"}
    
    with open(csv_file_path, 'rb') as f:
        files = {"file": (os.path.basename(csv_file_path), f, "text/csv")}
        
        print(f"Uploading {os.path.basename(csv_file_path)}...")
        print("This may take 10-20 seconds...")
        
        response = requests.post(url, headers=headers, files=files)
    
    if response.status_code == 200:
        result = response.json()
        print("-" * 70)
        
        print(f"File: {result['file_name']}")
        print(f"Records: {result['total_records']}")
        print(f"Channel: {result['channel_type']}")
        
        print(f"\nColumn Interpretation:")
        columns = result['column_interpretation']['columns']
        print(f"  Total Columns: {len(columns)}")
        print(f"  Primary Date: {result['column_interpretation'].get('primary_date_column', 'None')}")
        print(f"  Key Metrics: {', '.join(result['column_interpretation'].get('key_metrics', []))}")
        
        print(f"\nCalculated KPIs:")
        for kpi_name, kpi_value in result['kpis'].items():
            print(f"  {kpi_name}: {kpi_value:,.2f}")
        
        print(f"\nCharts Generated:")
        for i, chart in enumerate(result['charts'], 1):
            print(f"  {i}. {chart['title']} ({chart['type']})")
            print(f"     Data points: {len(chart['data'])}")
        
        print(f"\nRecommendations:")
        for i, rec in enumerate(result['recommendations'], 1):
            print(f"  {i}. {rec}")
        
        print("\n" + "-" * 70)
        
        output_file = f"analysis_result_{channel_type}.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\nFull response saved to: {output_file}")
        
    else:
        print(f"Status Code: {response.status_code}")
        print(f"Error: {response.text}")

def main():
    """Main test function"""
    print("Dynamic CSV Analysis Endpoint - Test Suite")
    print("=" * 70)
    
    print("\nTo get your auth token:")
    print("  1. Log in to the dashboard at http://localhost:3002")
    print("  2. Open browser DevTools (F12)")
    print("  3. Go to Console tab")
    print("  4. Run: localStorage.getItem('auth_token')")
    print("  5. Copy the token and paste it below\n")
    
    token = input("Enter your JWT token: ").strip()
    
    if not token:
        print("No token provided. Exiting.")
        return
    
    print("\nAvailable test files:")
    for i, (channel, path) in enumerate(TEST_FILES.items(), 1):
        exists = "YES" if os.path.exists(path) else "NO"
        print(f"  {i}. {channel:10} - {path} [{exists}]")
    
    print("\n" + "-" * 70)
    choice = input("\nEnter channel name to test (or 'all' for all): ").strip().lower()
    
    if choice == 'all':
        for channel, csv_path in TEST_FILES.items():
            if os.path.exists(csv_path):
                test_dynamic_analysis(channel, csv_path, token)
            else:
                print(f"\nSkipping {channel} - file not found")
    
    elif choice in TEST_FILES:
        csv_path = TEST_FILES[choice]
        if os.path.exists(csv_path):
            test_dynamic_analysis(choice, csv_path, token)
        else:
            print(f"File not found: {csv_path}")
    
    else:
        print(f"Invalid choice. Valid options: {', '.join(TEST_FILES.keys())}, all")
    
    print("\n" + "=" * 70)
    print("Test completed")

if __name__ == "__main__":
    main()
