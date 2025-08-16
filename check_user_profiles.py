#!/usr/bin/env python3
"""
Check user profiles to see if they have profile pictures
"""

import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"

def check_user_profiles():
    """Check user profiles for profile pictures"""
    print("🔍 Checking User Profiles")
    print("=" * 50)
    
    # Login with testsearch
    try:
        login_data = {
            "username": "testsearch",
            "password": "testpass123"
        }
        
        login_response = requests.post(f"{BASE_URL}/token/", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            return False
        
        token_data = login_response.json()
        access_token = token_data.get('access')
        if not access_token:
            print("❌ No access token received")
            return False
        
        print("✅ Login successful")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Headers for authenticated requests
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Check search results for different users
    test_users = ['testuser1', 'purnaacharya', 'sishirbhusal', 'testsearch']
    
    for username in test_users:
        print(f"\n🔍 Searching for user: {username}")
        try:
            search_response = requests.get(f"{BASE_URL}/users/search/?q={username}", headers=headers)
            
            if search_response.status_code == 200:
                search_results = search_response.json()
                
                for user in search_results:
                    if user.get('username') == username:
                        print(f"   ✅ Found: {user.get('full_name', 'N/A')} ({user.get('email', 'N/A')})")
                        profile_picture = user.get('profile_picture')
                        if profile_picture:
                            print(f"   📸 Profile picture: {profile_picture}")
                        else:
                            print(f"   ❌ No profile picture")
                        break
                else:
                    print(f"   ❌ User not found in search results")
            else:
                print(f"   ❌ Search failed: {search_response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Profile check completed!")

if __name__ == "__main__":
    check_user_profiles()
