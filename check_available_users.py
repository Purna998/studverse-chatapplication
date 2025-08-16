#!/usr/bin/env python3
"""
Check available users and their credentials
"""

import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"

def check_available_users():
    """Check available users and test their credentials"""
    print("🔍 Checking Available Users")
    print("=" * 50)
    
    # Test different user combinations
    test_users = [
        {"username": "sishirbhusal", "password": "testpass123"},
        {"username": "purnaacharya", "password": "testpass123"},
        {"username": "testsearch", "password": "testpass123"},
        {"username": "testuser1", "password": "testpass123"},
        {"username": "sishirbhusal", "password": "password123"},
        {"username": "purnaacharya", "password": "password123"},
        {"username": "sishirbhusal", "email": "sishirbhusal@gmail.com", "password": "testpass123"},
        {"username": "purnaacharya", "email": "acharyapurna2@gmail.com", "password": "testpass123"},
    ]
    
    successful_logins = []
    
    for user_data in test_users:
        print(f"\n🔍 Testing user: {user_data.get('username', 'N/A')}")
        try:
            login_response = requests.post(f"{BASE_URL}/token/", json=user_data)
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                access_token = token_data.get('access')
                if access_token:
                    print(f"   ✅ Login successful!")
                    successful_logins.append(user_data)
                    
                    # Test search functionality
                    headers = {
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                    
                    search_response = requests.get(f"{BASE_URL}/users/search/?q=test", headers=headers)
                    if search_response.status_code == 200:
                        search_results = search_response.json()
                        print(f"   📋 Search test: Found {len(search_results)} users")
                    else:
                        print(f"   ❌ Search test failed: {search_response.status_code}")
                else:
                    print(f"   ❌ No access token received")
            else:
                print(f"   ❌ Login failed: {login_response.status_code}")
                print(f"   Response: {login_response.text}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print(f"\n" + "=" * 50)
    print(f"✅ Found {len(successful_logins)} working user(s):")
    for user in successful_logins:
        print(f"   - {user.get('username', 'N/A')} ({user.get('email', 'N/A')})")
    
    return successful_logins

if __name__ == "__main__":
    check_available_users()
