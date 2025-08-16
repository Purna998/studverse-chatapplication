#!/usr/bin/env python3
"""
Test script for real-time message delivery between sishirbhusal and purnaacharya

This script tests:
1. User authentication for both users
2. Search functionality
3. Message sending
4. Real-time message delivery verification
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

def test_realtime_message_delivery():
    """Test real-time message delivery between sishirbhusal and purnaacharya"""
    print("🧪 Testing Real-time Message Delivery")
    print("=" * 60)
    
    # Step 1: Login with sishirbhusal (sender)
    print("1. Authenticating sishirbhusal (sender)...")
    try:
        sender_login_data = {
            "username": "sishirbhusal",
            "password": "testpass123"
        }
        
        sender_response = requests.post(f"{BASE_URL}/token/", json=sender_login_data)
        if sender_response.status_code != 200:
            print(f"❌ Sishirbhusal login failed: {sender_response.status_code}")
            print(f"Response: {sender_response.text}")
            return False
        
        sender_token_data = sender_response.json()
        sender_access_token = sender_token_data.get('access')
        if not sender_access_token:
            print("❌ No sishirbhusal access token received")
            return False
        
        print("✅ Sishirbhusal login successful")
        
    except Exception as e:
        print(f"❌ Sishirbhusal login error: {e}")
        return False
    
    # Step 2: Login with purnaacharya (receiver)
    print("\n2. Authenticating purnaacharya (receiver)...")
    try:
        receiver_login_data = {
            "username": "purnaacharya",
            "password": "testpass123"
        }
        
        receiver_response = requests.post(f"{BASE_URL}/token/", json=receiver_login_data)
        if receiver_response.status_code != 200:
            print(f"❌ Purnaacharya login failed: {receiver_response.status_code}")
            print(f"Response: {receiver_response.text}")
            return False
        
        receiver_token_data = receiver_response.json()
        receiver_access_token = receiver_token_data.get('access')
        if not receiver_access_token:
            print("❌ No purnaacharya access token received")
            return False
        
        print("✅ Purnaacharya login successful")
        
    except Exception as e:
        print(f"❌ Purnaacharya login error: {e}")
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
    
    # Step 3: Get purnaacharya's initial conversations count
    print("\n3. Getting purnaacharya's initial conversations...")
    try:
        receiver_conversations_response = requests.get(f"{BASE_URL}/conversations/", headers=receiver_headers)
        
        if receiver_conversations_response.status_code == 200:
            initial_conversations = receiver_conversations_response.json()
            initial_count = len(initial_conversations.get('data', []))
            print(f"✅ Purnaacharya has {initial_count} conversations initially")
        else:
            print(f"❌ Failed to get purnaacharya conversations: {receiver_conversations_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting purnaacharya conversations: {e}")
        return False
    
    # Step 4: Sishirbhusal searches for purnaacharya
    print("\n4. Sishirbhusal searching for purnaacharya...")
    try:
        search_response = requests.get(f"{BASE_URL}/users/search/?q=purnaacharya", headers=sender_headers)
        
        if search_response.status_code == 200:
            search_results = search_response.json()
            receiver_found = any(user.get('email') == 'acharyapurna2@gmail.com' for user in search_results)
            
            if receiver_found:
                log_test("User Search", "PASS", "Purnaacharya found in search results")
                receiver_user = next(user for user in search_results if user.get('email') == 'acharyapurna2@gmail.com')
                print(f"   Found: {receiver_user.get('full_name', 'N/A')} ({receiver_user.get('email', 'N/A')})")
                
                # Check if profile picture is included
                profile_picture = receiver_user.get('profile_picture')
                if profile_picture:
                    log_test("Profile Picture in Search", "PASS", f"Profile picture found: {profile_picture}")
                else:
                    log_test("Profile Picture in Search", "FAIL", "No profile picture in search results")
                    
            else:
                log_test("User Search", "FAIL", "Purnaacharya not found in search results")
                return False
        else:
            log_test("User Search", "FAIL", f"Search failed: {search_response.status_code}")
            return False
            
    except Exception as e:
        log_test("User Search", "FAIL", f"Error: {e}")
        return False
    
    # Step 5: Sishirbhusal sends message to purnaacharya
    print("\n5. Sishirbhusal sending message to purnaacharya...")
    try:
        message_data = {
            "receiver_email": "acharyapurna2@gmail.com",
            "content": "Hello Purna! This is a real-time test message from Sishir. Can you see this message immediately?"
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
            print(f"Response: {message_response.text}")
            return False
            
    except Exception as e:
        log_test("Message Sending", "FAIL", f"Error: {e}")
        return False
    
    # Step 6: Wait for WebSocket notifications to be processed
    print("\n6. Waiting for WebSocket notifications...")
    time.sleep(3)
    
    # Step 7: Check if purnaacharya now has the new conversation
    print("\n7. Checking purnaacharya's updated conversations...")
    try:
        updated_conversations_response = requests.get(f"{BASE_URL}/conversations/", headers=receiver_headers)
        
        if updated_conversations_response.status_code == 200:
            updated_conversations = updated_conversations_response.json()
            updated_count = len(updated_conversations.get('data', []))
            
            print(f"✅ Purnaacharya now has {updated_count} conversations")
            
            if updated_count > initial_count:
                log_test("Real-time Message Delivery", "PASS", f"Purnaacharya automatically received new conversation (count: {initial_count} -> {updated_count})")
                
                # Check if the new conversation contains the message
                conversations_data = updated_conversations.get('data', [])
                new_conversation = None
                
                for conv in conversations_data:
                    other_participant = conv.get('other_participant', {})
                    if other_participant.get('email') == 'sishirbhusal@gmail.com':
                        new_conversation = conv
                        break
                
                if new_conversation:
                    last_message = new_conversation.get('last_message', {})
                    if last_message and 'real-time test message from Sishir' in last_message.get('content', ''):
                        log_test("Message Content", "PASS", "New conversation contains the sent message")
                        print(f"   Message: {last_message.get('content', '')[:50]}...")
                    else:
                        log_test("Message Content", "FAIL", "New conversation does not contain the sent message")
                else:
                    log_test("Message Content", "FAIL", "Could not find the new conversation")
                    
            else:
                log_test("Real-time Message Delivery", "FAIL", f"Purnaacharya did not receive new conversation (count: {initial_count} -> {updated_count})")
                return False
        else:
            log_test("Real-time Message Delivery", "FAIL", f"Failed to get updated conversations: {updated_conversations_response.status_code}")
            return False
            
    except Exception as e:
        log_test("Real-time Message Delivery", "FAIL", f"Error: {e}")
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
                
                if 'real-time test message from Sishir' in message_content:
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
    
    # Step 9: Test multiple messages for real-time delivery
    print("\n9. Testing multiple messages for real-time delivery...")
    try:
        for i in range(1, 4):
            message_data = {
                "receiver_email": "acharyapurna2@gmail.com",
                "content": f"Real-time message #{i} from Sishir to Purna - timestamp: {datetime.now().strftime('%H:%M:%S')}"
            }
            
            message_response = requests.post(f"{BASE_URL}/send_message_new/", json=message_data, headers=sender_headers)
            
            if message_response.status_code == 201:
                log_test(f"Multiple Message {i}", "PASS", f"Message {i} sent successfully")
                time.sleep(1)  # Wait 1 second between messages
            else:
                log_test(f"Multiple Message {i}", "FAIL", f"Message {i} failed: {message_response.status_code}")
                
    except Exception as e:
        log_test("Multiple Messages", "FAIL", f"Error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Real-time message delivery test completed!")
    return True

if __name__ == "__main__":
    test_realtime_message_delivery()
