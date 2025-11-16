import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('LLM_API_KEY')

print("🔍 Checking available Gemini models for your API key...\n")

# List models endpoint
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}\n")
    
    if response.status_code == 200:
        data = response.json()
        
        if 'models' in data:
            print(f"✅ Found {len(data['models'])} models:\n")
            
            for model in data['models']:
                name = model.get('name', 'Unknown')
                display_name = model.get('displayName', 'N/A')
                supported_methods = model.get('supportedGenerationMethods', [])
                
                print(f"📦 Model: {name}")
                print(f"   Display Name: {display_name}")
                print(f"   Supported Methods: {', '.join(supported_methods)}")
                
                # Check if generateContent is supported
                if 'generateContent' in supported_methods:
                    print(f"   ✅ Supports generateContent")
                    print(f"   🔗 Endpoint: https://generativelanguage.googleapis.com/v1beta/{name}:generateContent")
                print()
        else:
            print("❌ No models found in response")
            print(f"Response: {data}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Exception occurred: {e}")
