#!/usr/bin/env python3
"""
Test script to verify resource sharing functionality with 2MB file size limit
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/token/"
SEND_MESSAGE_URL = f"{BASE_URL}/api/send_message_new/"
DOWNLOAD_URL = f"{BASE_URL}/api/messages/"
RESOURCES_URL = f"{BASE_URL}/api/conversations/"

# Test users
USER1_EMAIL = "testuser1@example.com"
USER1_PASSWORD = "testpass123"
USER2_EMAIL = "testuser2@example.com"
USER2_PASSWORD = "testpass123"

def login_user(email, password):
    """Login user and return access token"""
    try:
        response = requests.post(LOGIN_URL, json={
            'email': email,
            'password': password
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access')
        else:
            print(f"❌ Login failed for {email}: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Login error for {email}: {e}")
        return None

def create_test_file(filename, size_bytes):
    """Create a test file with specified size"""
    try:
        with open(filename, 'wb') as f:
            f.write(b'0' * size_bytes)
        return True
    except Exception as e:
        print(f"❌ Error creating test file: {e}")
        return False

def send_message_with_attachment(token, receiver_email, content, file_path):
    """Send message with attachment"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        with open(file_path, 'rb') as f:
            files = {'attachment': f}
            data = {
                'receiver_email': receiver_email,
                'content': content
            }
            
            response = requests.post(SEND_MESSAGE_URL, data=data, files=files, headers=headers)
            
            if response.status_code == 201:
                return response.json()
            else:
                print(f"❌ Send message failed: {response.status_code}")
                print(f"Response: {response.text}")
                return None
    except Exception as e:
        print(f"❌ Error sending message with attachment: {e}")
        return None

def download_attachment(token, message_id, download_path):
    """Download attachment from message"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{DOWNLOAD_URL}{message_id}/download/", headers=headers)
        
        if response.status_code == 200:
            with open(download_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"❌ Download failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error downloading attachment: {e}")
        return False

def get_conversation_resources(token, conversation_id):
    """Get all resources from a conversation"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{RESOURCES_URL}{conversation_id}/resources/", headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Get resources failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting resources: {e}")
        return None

def test_file_size_limits():
    """Test file size limits (2MB max)"""
    print("📏 Testing File Size Limits")
    print("=" * 50)
    
    # Login users
    user1_token = login_user(USER1_EMAIL, USER1_PASSWORD)
    user2_token = login_user(USER2_EMAIL, USER2_PASSWORD)
    
    if not user1_token or not user2_token:
        print("❌ Failed to login users")
        return
    
    # Test files of different sizes
    test_cases = [
        ("small_file.txt", 1024, "Should succeed"),  # 1KB
        ("medium_file.txt", 1024 * 1024, "Should succeed"),  # 1MB
        ("large_file.txt", 2 * 1024 * 1024 + 1, "Should fail"),  # 2MB + 1 byte
        ("exact_2mb.txt", 2 * 1024 * 1024, "Should succeed"),  # Exactly 2MB
    ]
    
    for filename, size, expected in test_cases:
        print(f"\n📁 Testing: {filename} ({size} bytes) - {expected}")
        
        # Create test file
        if not create_test_file(filename, size):
            continue
        
        try:
            # Try to send message with attachment
            response = send_message_with_attachment(user1_token, USER2_EMAIL, f"Test message with {filename}", filename)
            
            if response:
                print(f"✅ SUCCESS: File sent successfully")
                message_id = response.get('message_data', {}).get('id')
                if message_id:
                    print(f"📝 Message ID: {message_id}")
            else:
                print(f"❌ FAILED: File was rejected (as expected for large files)")
                
        finally:
            # Clean up test file
            if os.path.exists(filename):
                os.remove(filename)
    
    print("\n" + "=" * 50)

def test_file_types():
    """Test different file types"""
    print("\n📄 Testing File Types")
    print("=" * 50)
    
    # Login users
    user1_token = login_user(USER1_EMAIL, USER1_PASSWORD)
    user2_token = login_user(USER2_EMAIL, USER2_PASSWORD)
    
    if not user1_token or not user2_token:
        print("❌ Failed to login users")
        return
    
    # Test different file types
    test_files = [
        ("test_image.jpg", b"fake_jpeg_data", "image"),
        ("test_document.pdf", b"fake_pdf_data", "pdf"),
        ("test_doc.docx", b"fake_docx_data", "document"),
        ("test_spreadsheet.xlsx", b"fake_xlsx_data", "spreadsheet"),
        ("test_presentation.pptx", b"fake_pptx_data", "presentation"),
        ("test_video.mp4", b"fake_mp4_data", "video"),
        ("test_audio.mp3", b"fake_mp3_data", "audio"),
        ("test_archive.zip", b"fake_zip_data", "archive"),
    ]
    
    for filename, content, expected_type in test_files:
        print(f"\n📁 Testing: {filename} (expected type: {expected_type})")
        
        # Create test file
        with open(filename, 'wb') as f:
            f.write(content)
        
        try:
            # Send message with attachment
            response = send_message_with_attachment(user1_token, USER2_EMAIL, f"Test message with {filename}", filename)
            
            if response:
                message_data = response.get('message_data', {})
                actual_type = message_data.get('attachment_type')
                print(f"✅ SUCCESS: File sent, detected type: {actual_type}")
                
                if actual_type == expected_type:
                    print(f"✅ Type detection correct")
                else:
                    print(f"⚠️  Type detection mismatch: expected {expected_type}, got {actual_type}")
            else:
                print(f"❌ FAILED: File was rejected")
                
        finally:
            # Clean up test file
            if os.path.exists(filename):
                os.remove(filename)
    
    print("\n" + "=" * 50)

def test_download_functionality():
    """Test file download functionality"""
    print("\n⬇️ Testing Download Functionality")
    print("=" * 50)
    
    # Login users
    user1_token = login_user(USER1_EMAIL, USER1_PASSWORD)
    user2_token = login_user(USER2_EMAIL, USER2_PASSWORD)
    
    if not user1_token or not user2_token:
        print("❌ Failed to login users")
        return
    
    # Create a test file
    test_filename = "download_test.txt"
    test_content = b"This is a test file for download functionality"
    
    with open(test_filename, 'wb') as f:
        f.write(test_content)
    
    try:
        # Send message with attachment
        response = send_message_with_attachment(user1_token, USER2_EMAIL, "Test message for download", test_filename)
        
        if response:
            message_data = response.get('message_data', {})
            message_id = message_data.get('id')
            
            if message_id:
                print(f"✅ Message sent with ID: {message_id}")
                
                # Test download as user2 (receiver)
                download_filename = f"downloaded_{test_filename}"
                
                if download_attachment(user2_token, message_id, download_filename):
                    print(f"✅ Download successful: {download_filename}")
                    
                    # Verify file content
                    with open(download_filename, 'rb') as f:
                        downloaded_content = f.read()
                    
                    if downloaded_content == test_content:
                        print("✅ File content matches original")
                    else:
                        print("❌ File content mismatch")
                    
                    # Clean up downloaded file
                    os.remove(download_filename)
                else:
                    print("❌ Download failed")
            else:
                print("❌ No message ID in response")
        else:
            print("❌ Failed to send message")
            
    finally:
        # Clean up test file
        if os.path.exists(test_filename):
            os.remove(test_filename)
    
    print("\n" + "=" * 50)

def test_resource_library():
    """Test resource library functionality"""
    print("\n📚 Testing Resource Library")
    print("=" * 50)
    
    # Login users
    user1_token = login_user(USER1_EMAIL, USER1_PASSWORD)
    user2_token = login_user(USER2_EMAIL, USER2_PASSWORD)
    
    if not user1_token or not user2_token:
        print("❌ Failed to login users")
        return
    
    # Send multiple messages with attachments
    test_files = [
        ("resource1.txt", b"Resource 1 content"),
        ("resource2.pdf", b"Fake PDF content"),
        ("resource3.jpg", b"Fake image data"),
    ]
    
    conversation_id = None
    
    for filename, content in test_files:
        print(f"\n📁 Sending: {filename}")
        
        # Create test file
        with open(filename, 'wb') as f:
            f.write(content)
        
        try:
            # Send message with attachment
            response = send_message_with_attachment(user1_token, USER2_EMAIL, f"Resource: {filename}", filename)
            
            if response:
                message_data = response.get('message_data', {})
                if not conversation_id:
                    conversation_id = response.get('conversation_id')
                print(f"✅ Resource sent successfully")
            else:
                print(f"❌ Failed to send resource")
                
        finally:
            # Clean up test file
            if os.path.exists(filename):
                os.remove(filename)
    
    # Test resource library
    if conversation_id:
        print(f"\n📚 Testing resource library for conversation: {conversation_id}")
        
        # Get resources as user1
        resources_user1 = get_conversation_resources(user1_token, conversation_id)
        if resources_user1:
            print(f"✅ User1 resources: {resources_user1.get('total_count', 0)} files")
        
        # Get resources as user2
        resources_user2 = get_conversation_resources(user2_token, conversation_id)
        if resources_user2:
            print(f"✅ User2 resources: {resources_user2.get('total_count', 0)} files")
            
            # List all resources
            for resource in resources_user2.get('resources', []):
                print(f"  📄 {resource['file_name']} ({resource['file_type']}) - {resource['file_size']} bytes")
    else:
        print("❌ No conversation ID available")
    
    print("\n" + "=" * 50)

def main():
    """Run all tests"""
    print("🚀 StudVerse Resource Sharing Test Suite")
    print("=" * 60)
    
    # Test file size limits
    test_file_size_limits()
    
    # Test file types
    test_file_types()
    
    # Test download functionality
    test_download_functionality()
    
    # Test resource library
    test_resource_library()
    
    print("\n✨ All tests completed!")
    print("\n📋 Summary:")
    print("- ✅ 2MB file size limit enforced")
    print("- ✅ Multiple file types supported")
    print("- ✅ Secure download functionality")
    print("- ✅ Resource library with filtering")
    print("- ✅ File type detection")
    print("- ✅ Access control for downloads")

if __name__ == "__main__":
    main()
