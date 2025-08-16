#!/usr/bin/env python3
"""
Test script for automatic message delivery when searching and starting a chat

This script tests that when a user searches for another user and sends a message,
the receiver automatically sees the message and the new conversation appears in their chat list.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"

def log_test(test_name, status, details=""):
    """Log test results"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌"
    print(f"{status_icon} [{timestamp}] {test_name}: {status}")
    if details:
        print(f"   Details: {details}")
    print()

def test_auto_message_delivery():
    """Test automatic message delivery when searching and starting a chat"""
    print("🧪 Testing Automatic Message Delivery")
    print("=" * 60)
    
    # Step 1: Login with first user (sender)
    print("1. Authenticating sender...")
    try:
        sender_login_data = {
            "username": "testsearch",
            "password": "testpass123"
        }
        
        sender_response = requests.post(f"{BASE_URL}/token/", json=sender_login_data)
        if sender_response.status_code != 200:
            print(f"❌ Sender login failed: {sender_response.status_code}")
            print(f"Response: {sender_response.text}")
            return False
        
        sender_token_data = sender_response.json()
        sender_access_token = sender_token_data.get('access')
        if not sender_access_token:
            print("❌ No sender access token received")
            return False
        
        print("✅ Sender login successful")
        
    except Exception as e:
        print(f"❌ Sender login error: {e}")
        return False
    
    # Step 2: Login with second user (receiver)
    print("\n2. Authenticating receiver...")
    try:
        receiver_login_data = {
            "username": "testuser1",
            "password": "testpass123"
        }
        
        receiver_response = requests.post(f"{BASE_URL}/token/", json=receiver_login_data)
        if receiver_response.status_code != 200:
            print(f"❌ Receiver login failed: {receiver_response.status_code}")
            print(f"Response: {receiver_response.text}")
            return False
        
        receiver_token_data = receiver_response.json()
        receiver_access_token = receiver_token_data.get('access')
        if not receiver_access_token:
            print("❌ No receiver access token received")
            return False
        
        print("✅ Receiver login successful")
        
    except Exception as e:
        print(f"❌ Receiver login error: {e}")
        return False
    
    # Headers for authenticated requests
    sender_headers = {
        "Authorization": f"Bearer {sender_access_token}",
        "Content-Type": "application/json"
    }
    
    receiver_headers = {
        "Authorization": f"Bearer {receiver_access_token}",
        "Content-Type": "application/json"
    }
    
    # Step 3: Get receiver's initial conversations count
    print("\n3. Getting receiver's initial conversations...")
    try:
        receiver_conversations_response = requests.get(f"{BASE_URL}/conversations/", headers=receiver_headers)
        
        if receiver_conversations_response.status_code == 200:
            initial_conversations = receiver_conversations_response.json()
            initial_count = len(initial_conversations.get('data', []))
            print(f"✅ Receiver has {initial_count} conversations initially")
        else:
            print(f"❌ Failed to get receiver conversations: {receiver_conversations_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting receiver conversations: {e}")
        return False
    
    # Step 4: Sender searches for receiver
    print("\n4. Sender searching for receiver...")
    try:
        search_response = requests.get(f"{BASE_URL}/users/search/?q=testuser1", headers=sender_headers)
        
        if search_response.status_code == 200:
            search_results = search_response.json()
            receiver_found = any(user.get('email') == 'testuser1@example.com' for user in search_results)
            
            if receiver_found:
                log_test("User Search", "PASS", "Receiver found in search results")
                receiver_user = next(user for user in search_results if user.get('email') == 'testuser1@example.com')
                print(f"   Found: {receiver_user.get('full_name', 'N/A')} ({receiver_user.get('email', 'N/A')})")
            else:
                log_test("User Search", "FAIL", "Receiver not found in search results")
                return False
        else:
            log_test("User Search", "FAIL", f"Search failed: {search_response.status_code}")
            return False
            
    except Exception as e:
        log_test("User Search", "FAIL", f"Error: {e}")
        return False
    
    # Step 5: Sender sends message to receiver (simulating search and start chat)
    print("\n5. Sender sending message to receiver...")
    try:
        message_data = {
            "receiver_email": "testuser1@example.com",
            "content": "Hello! This is a test message from search functionality. I found you through search and started this conversation."
        }
        
        message_response = requests.post(f"{BASE_URL}/send_message_new/", json=message_data, headers=sender_headers)
        
        if message_response.status_code == 201:
            result = message_response.json()
            conversation_id = result.get('conversation_id')
            is_new_conversation = result.get('is_new_conversation', False)
            
            if conversation_id:
                log_test("Message Sending", "PASS", f"Message sent successfully, conversation ID: {conversation_id}")
                print(f"   New conversation: {is_new_conversation}")
            else:
                log_test("Message Sending", "FAIL", "No conversation ID in response")
                return False
        else:
            log_test("Message Sending", "FAIL", f"Message sending failed: {message_response.status_code}")
            return False
            
    except Exception as e:
        log_test("Message Sending", "FAIL", f"Error: {e}")
        return False
    
    # Step 6: Wait a moment for WebSocket notifications to be processed
    print("\n6. Waiting for WebSocket notifications...")
    time.sleep(2)
    
    # Step 7: Check if receiver now has the new conversation
    print("\n7. Checking receiver's updated conversations...")
    try:
        updated_conversations_response = requests.get(f"{BASE_URL}/conversations/", headers=receiver_headers)
        
        if updated_conversations_response.status_code == 200:
            updated_conversations = updated_conversations_response.json()
            updated_count = len(updated_conversations.get('data', []))
            
            print(f"✅ Receiver now has {updated_count} conversations")
            
            if updated_count > initial_count:
                log_test("Auto Message Delivery", "PASS", f"Receiver automatically received new conversation (count: {initial_count} -> {updated_count})")
                
                # Check if the new conversation contains the message
                conversations_data = updated_conversations.get('data', [])
                new_conversation = None
                
                for conv in conversations_data:
                    other_participant = conv.get('other_participant', {})
                    if other_participant.get('email') == 'testsearch@example.com':
                        new_conversation = conv
                        break
                
                if new_conversation:
                    last_message = new_conversation.get('last_message', {})
                    if last_message and 'search functionality' in last_message.get('content', ''):
                        log_test("Message Content", "PASS", "New conversation contains the sent message")
                    else:
                        log_test("Message Content", "FAIL", "New conversation does not contain the sent message")
                else:
                    log_test("Message Content", "FAIL", "Could not find the new conversation")
                    
            else:
                log_test("Auto Message Delivery", "FAIL", f"Receiver did not receive new conversation (count: {initial_count} -> {updated_count})")
                return False
        else:
            log_test("Auto Message Delivery", "FAIL", f"Failed to get updated conversations: {updated_conversations_response.status_code}")
            return False
            
    except Exception as e:
        log_test("Auto Message Delivery", "FAIL", f"Error: {e}")
        return False
    
    # Step 8: Verify the message content in the conversation
    print("\n8. Verifying message content in conversation...")
    try:
        # Get the conversation messages
        conversation_messages_response = requests.get(f"{BASE_URL}/conversations/{conversation_id}/messages/", headers=receiver_headers)
        
        if conversation_messages_response.status_code == 200:
            messages_data = conversation_messages_response.json()
            messages = messages_data.get('data', [])
            
            if messages:
                latest_message = messages[-1]  # Get the most recent message
                message_content = latest_message.get('content', '')
                
                if 'search functionality' in message_content:
                    log_test("Message Verification", "PASS", "Message content verified in conversation")
                    print(f"   Message: {message_content[:50]}...")
                else:
                    log_test("Message Verification", "FAIL", "Message content not found in conversation")
            else:
                log_test("Message Verification", "FAIL", "No messages found in conversation")
        else:
            log_test("Message Verification", "FAIL", f"Failed to get conversation messages: {conversation_messages_response.status_code}")
            
    except Exception as e:
        log_test("Message Verification", "FAIL", f"Error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Automatic message delivery test completed!")
    return True

if __name__ == "__main__":
    test_auto_message_delivery()
