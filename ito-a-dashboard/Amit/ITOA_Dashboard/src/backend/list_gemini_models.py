"""
Script to list all available Gemini models
Run this to find the correct model name to use
"""
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    exit(1)

# Configure the API
genai.configure(api_key=api_key)

print("🔍 Listing all available Gemini models...\n")
print("=" * 80)

try:
    models = genai.list_models()
    
    print(f"\n✅ Found {len(list(models))} models:\n")
    
    # Re-fetch because the iterator was consumed
    for model in genai.list_models():
        # Check if the model supports generateContent
        if 'generateContent' in model.supported_generation_methods:
            print(f"   Display Name: {model.display_name}")
            print(f"   Description: {model.description}")
            print(f"   Supported Methods: {', '.join(model.supported_generation_methods)}")
            print()
        else:
            print(f"⚠️  {model.name} (doesn't support generateContent)")
            print()
    
    print("=" * 80)
    print("   Example: genai.GenerativeModel('models/gemini-1.5-flash')")
    
except Exception as e:
    print("\nTroubleshooting:")
    print("1. Check if your GEMINI_API_KEY is valid")
    print("2. Verify you have internet connection")
    print("3. Make sure google-generativeai is installed: pip3 install google-generativeai")
