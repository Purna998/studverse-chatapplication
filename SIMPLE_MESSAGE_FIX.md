# Simple Message Sender Visibility Fix

## The Problem
Users cannot see their own messages immediately after sending them.

## Root Cause
The issue is likely in the React state management and WebSocket handling. Let me provide a simple, focused fix.

## Step-by-Step Fix

### Step 1: Test the Basic Functionality
First, test if the basic message sending works by opening `test_message_display.html` in your browser. This will help us isolate if the issue is with React state management or WebSocket handling.

### Step 2: Simple Fix for ChatWindow.jsx

Replace the `handleSendMessage` function in `frontend/src/components/chat/ChatWindow.jsx` with this simplified version:

```javascript
const handleSendMessage = async () => {
  if (!message.trim()) return;
  if (!selectedChat) return;

  const messageContent = message.trim();
  console.log('Sending message:', messageContent);

  try {
    setSending(true);
    setError(null);

    // Create message object for immediate UI display
    const tempMessageId = `temp_${user.username}_${Date.now()}`;
    const newMessage = {
      id: tempMessageId,
      content: messageContent,
      sender_username: user.username,
      sender_full_name: user.full_name || user.username,
      sender_profile_picture: user.profile_picture || user.profile?.profile_picture,
      timestamp: new Date().toISOString(),
      is_read: false,
      attachment: null,
      attachment_type: null,
      is_temp: false
    };

    console.log('=== MESSAGE SENDING DEBUG ===');
    console.log('Current messages before adding:', messages);
    console.log('New message to add:', newMessage);

    // IMMEDIATE UI UPDATE - Add message to UI instantly
    setMessages(prev => {
      const updated = [...prev, newMessage];
      console.log('Messages after adding:', updated);
      return updated;
    });
    
    // Clear input immediately for better UX
    setMessage("");
    
    // Scroll to bottom immediately
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        console.log('Scrolled to bottom');
      }
    }, 100);

    // Send via WebSocket (but don't rely on it for UI updates)
    if (selectedChat.is_temp) {
      console.log('Sending first message to create conversation');
      websocketManager.sendMessage(messageContent, user.username, selectedChat.other_participant.username);
      
      // Also send via API to create conversation
      try {
        const response = await api.chat.sendMessageNew(selectedChat.other_participant.email, messageContent);
        if (response.conversation_id) {
          console.log('Conversation created, updating chat');
          const updatedChat = {
            ...selectedChat,
            id: response.conversation_id,
            is_temp: false,
            last_message: messageContent,
            last_message_time: new Date().toISOString(),
            unread_count: 0
          };

          if (response.message_data) {
            setMessages(prev => prev.map(msg => 
              msg.id === tempMessageId 
                ? { ...msg, id: response.message_data.id }
                : msg
            ));
          }

          if (onMessageSent) {
            onMessageSent(updatedChat);
          }
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    } else {
      console.log('Sending message via WebSocket');
      websocketManager.sendMessage(messageContent, user.username, selectedChat.other_participant.username);
      
      // Also send via API for persistence
      try {
        const response = await api.chat.sendMessageNew(selectedChat.other_participant.email, messageContent);
        if (response.message_data) {
          console.log('Message sent successfully via API');
          setMessages(prev => prev.map(msg => 
            msg.id === tempMessageId 
              ? { ...msg, id: response.message_data.id }
              : msg
          ));
        }
      } catch (error) {
        console.error("Error sending message via API:", error);
      }
      
      if (onMessageSent) {
        onMessageSent({
          ...selectedChat,
          last_message: messageContent,
          last_message_time: new Date().toISOString(),
          unread_count: 0
        });
      }
    }
  } catch (error) {
    console.error("Error sending message:", error);
    setError("Failed to send message");
    
    // Remove the message from UI if there was an error
    setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
  } finally {
    setSending(false);
  }
};
```

### Step 3: Simplify WebSocket Handling

Replace the WebSocket message handler with this simplified version:

```javascript
const handleWebSocketMessage = (data) => {
  // Handle ping/pong messages
  if (data.type === 'pong') {
    return;
  }
  
  // Only process actual messages
  if (!data.message) {
    console.log('Skipping message without content:', data);
    return;
  }
  
  console.log('WebSocket message received:', data);
  
  // Check if this message is for the current user (as receiver)
  const isMessageForCurrentUser = data.receiver === user.username;
  const isMessageFromCurrentUser = data.sender === user.username;
  
  // For now, ignore messages from current user to focus on immediate UI updates
  if (isMessageFromCurrentUser) {
    console.log('Ignoring WebSocket confirmation from current user');
    return;
  }
  
  // Handle incoming messages from other users
  if (isMessageForCurrentUser && !isMessageFromCurrentUser) {
    console.log('Received message from other user:', data);
    
    // Check if this message is for the current conversation
    const isRelevantMessage = selectedChat && !selectedChat.is_temp && 
      data.sender === selectedChat.other_participant.username && 
      data.receiver === user.username;

    if (isRelevantMessage) {
      const messageId = data.message_id || `${data.sender}-${data.message}-${data.timestamp}`;
      
      // Check for duplicates
      if (recentMessages.has(messageId)) {
        console.log('Duplicate message detected, ignoring:', messageId);
        return;
      }
      
      console.log('Adding incoming message to UI');
      
      const newMessage = {
        id: messageId,
        content: data.message,
        sender_username: data.sender,
        sender_full_name: selectedChat.other_participant.full_name || data.sender,
        sender_profile_picture: selectedChat.other_participant.profile_picture,
        timestamp: new Date(data.timestamp * 1000).toISOString(),
        is_read: false
      };
      
      setMessages(prev => {
        const updated = [...prev, newMessage];
        return updated.slice(-100);
      });
      
      setRecentMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(messageId);
        if (newSet.size > 100) {
          const array = Array.from(newSet);
          return new Set(array.slice(-100));
        }
        return newSet;
      });
      
      // Scroll to bottom
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }
  }
};
```

### Step 4: Test the Fix

1. **Start the servers**:
   ```bash
   # Backend
   cd backend && python manage.py runserver
   
   # Frontend (in another terminal)
   cd frontend && npm run dev
   ```

2. **Test the application**:
   - Open the app in two different browsers
   - Log in with different user accounts
   - Send messages between users
   - Check the browser console for debug logs

3. **Expected behavior**:
   - Messages should appear immediately when sent
   - Console should show "Messages after adding:" with the new message
   - Chat should scroll to bottom automatically

### Step 5: Debugging

If messages still don't appear, check the browser console for:

1. **"MESSAGE SENDING DEBUG"** logs - these show the message creation
2. **"Messages after adding:"** logs - these show the state update
3. **"Rendering message:"** logs - these show if messages are being rendered

### Step 6: Alternative Test

If the React app is still not working, test the basic functionality with the HTML test page:

1. Open `test_message_display.html` in your browser
2. Type a message and click "Send"
3. Verify that the message appears immediately

This will help determine if the issue is with React state management or something else.

## Key Changes Made

1. **Simplified State Management**: Removed complex pending message tracking
2. **Immediate UI Updates**: Messages are added to state immediately, not waiting for WebSocket
3. **Reduced WebSocket Dependencies**: WebSocket is used for delivery but not for UI updates
4. **Enhanced Debugging**: Added comprehensive logging to track the issue
5. **Forced Re-renders**: Added state updates to ensure UI refreshes

## Expected Result

After implementing these changes, users should see their messages immediately after sending them. The fix focuses on immediate UI updates rather than relying on WebSocket confirmations.
