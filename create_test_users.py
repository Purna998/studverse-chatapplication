#!/usr/bin/env python3
"""
Create test users for file upload testing
"""
import requests
import json

BASE_URL = "http://localhost:8000"
REGISTER_URL = f"{BASE_URL}/api/user/register/"

def create_test_users():
    """Create test users if they don't exist"""
    print("👥 Creating Test Users")
    
    test_users = [
        {
            'email': 'testuser1@example.com',
            'username': 'testuser1',
            'password': 'testpass123',
            'full_name': 'Test User 1'
        },
        {
            'email': 'testuser2@example.com',
            'username': 'testuser2',
            'password': 'testpass123',
            'full_name': 'Test User 2'
        }
    ]
    
    for user in test_users:
        try:
            print(f"📝 Creating user: {user['email']}")
            response = requests.post(REGISTER_URL, json=user)
            
            if response.status_code == 201:
                print(f"✅ User {user['email']} created successfully")
            elif response.status_code == 400:
                data = response.json()
                if 'email' in data and 'already exists' in str(data['email']):
                    print(f"ℹ️  User {user['email']} already exists")
                else:
                    print(f"⚠️  User creation failed: {data}")
            else:
                print(f"❌ User creation failed: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating user {user['email']}: {e}")

if __name__ == "__main__":
    create_test_users()
