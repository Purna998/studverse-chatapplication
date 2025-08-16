import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import websocketManager from "../../utils/websocket";
import ProfilePicture from "../common/ProfilePicture";

const ChatWindow = ({ selectedChat, onMessageSent }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [recentMessages, setRecentMessages] = useState(new Set());
  const [unreadMessages, setUnreadMessages] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [messageCache, setMessageCache] = useState(new Map()); // Cache messages by conversation ID
  const { user } = useAuth();

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show in-app notification toast
  const showInAppNotification = (sender, message) => {
    setNotification({
      sender,
      message,
      timestamp: new Date()
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Load messages when selectedChat changes
  useEffect(() => {
    if (selectedChat && !selectedChat.is_temp) {
      // Check if we have cached messages for this conversation
      const conversationId = selectedChat.id.toString();
      const cachedMessages = messageCache.get(conversationId);
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('Using cached messages for conversation:', conversationId);
        setMessages(cachedMessages);
        // Still load from server to get latest messages, but don't clear the UI
        loadMessages(selectedChat.hasUnreadMessages, false);
      } else {
        console.log('No cached messages, loading from server for conversation:', conversationId);
        loadMessages(selectedChat.hasUnreadMessages, true);
      }
      
      setRecentMessages(new Set());
      markConversationAsRead();
    } else if (selectedChat && selectedChat.is_temp) {
      setMessages([]);
      setRecentMessages(new Set());
    }
  }, [selectedChat]);

  // WebSocket connection and message handling
  useEffect(() => {
    websocketManager.connect();
    
    const handleWebSocketMessage = (data) => {
      console.log('ChatWindow: WebSocket message received:', data);
      
      // Handle conversation refresh notifications
      if (data.type === 'conversation_refresh') {
        console.log('ChatWindow: New conversation detected, refreshing conversations');
        console.log('ChatWindow: Refresh data:', data);
        if (onMessageSent) {
          onMessageSent(null); // Pass null to indicate refresh needed
        }
        return;
      }
      
      // Check if this message is for the current conversation
      const isMessageForCurrentConversation = selectedChat && 
        data.conversation_id && 
        data.conversation_id.toString() === selectedChat.id.toString();
      
      const isMessageForCurrentUser = data.receiver === user.username;
      const isMessageFromCurrentUser = data.sender === user.username;
      
      // Handle new messages for current user (as receiver)
      if (isMessageForCurrentUser && !isMessageFromCurrentUser) {
        console.log('ChatWindow: New message received for current user');
        console.log('ChatWindow: Message data:', data);
        
        // Check if this message is for the current conversation
        const isMessageForCurrentConversation = selectedChat && 
          data.conversation_id && 
          data.conversation_id.toString() === selectedChat.id.toString();
        
        if (isMessageForCurrentConversation) {
          console.log('ChatWindow: Adding message to current conversation view');
          
          // Add the new message to the messages list
          const newMessage = {
            id: data.message_id || `temp_${Date.now()}`,
            content: data.message,
            sender: data.sender,
            sender_username: data.sender,
            sender_full_name: data.sender_full_name || data.sender,
            timestamp: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
            is_read: false
          };
          
          setMessages(prevMessages => {
            const updated = [...prevMessages, newMessage];
            
            // Also update the cache
            if (selectedChat && selectedChat.id) {
              const conversationId = selectedChat.id.toString();
              setMessageCache(prevCache => {
                const newCache = new Map(prevCache);
                newCache.set(conversationId, updated);
                return newCache;
              });
            }
            
            return updated;
          });
          
          // Scroll to bottom to show new message
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } else {
          console.log('ChatWindow: Message received but not for current conversation - will be handled by Sidebar');
        }
        
        // Always trigger conversation refresh to update the sidebar
        if (onMessageSent) {
          onMessageSent(null); // Pass null to indicate refresh needed
        }
      }
      
      // Handle sent message confirmation
      if (isMessageFromCurrentUser && (data.type === 'message_sent' || data.message_type === 'message_sent')) {
        console.log('ChatWindow: Message sent confirmation received');
        console.log('ChatWindow: Sent message data:', data);
        
        // Update any temporary messages with the confirmed message data
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => {
            // Check if this is a temporary message that matches the confirmed message
            if (msg.id.toString().startsWith('temp_') && 
                msg.content === data.message &&
                msg.sender_username === user.username) {
              console.log('Updating temporary message with confirmed data:', msg.id, '->', data.message_id);
              return {
                ...msg,
                id: data.message_id || msg.id,
                timestamp: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : msg.timestamp,
                is_temp: false
              };
            }
            return msg;
          });
          
          // Also update the cache
          if (selectedChat && selectedChat.id) {
            const conversationId = selectedChat.id.toString();
            setMessageCache(prevCache => {
              const newCache = new Map(prevCache);
              newCache.set(conversationId, updatedMessages);
              return newCache;
            });
          }
          
          return updatedMessages;
        });
      }
    };

    websocketManager.addMessageHandler(handleWebSocketMessage);

    return () => {
      websocketManager.removeMessageHandler(handleWebSocketMessage);
    };
  }, [selectedChat, user]);

  const loadMessages = async (hasUnreadMessages = false, forceReload = false) => {
    if (!selectedChat || selectedChat.is_temp) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.chat.getConversationMessages(selectedChat.id);
      if (response.data) {
        // Merge server messages with any cached messages
        setMessages(prevMessages => {
          const conversationId = selectedChat.id.toString();
          const cachedMessages = messageCache.get(conversationId) || [];
          
          // Keep any temporary messages that haven't been confirmed yet
          const tempMessages = cachedMessages.filter(msg => 
            msg.id.toString().startsWith('temp_') && 
            msg.sender_username === user.username
          );
          
          // Combine server messages with temporary messages
          const allMessages = [...response.data, ...tempMessages];
          
          // Sort by timestamp to maintain correct order
          allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          // Update cache with the merged messages
          setMessageCache(prevCache => {
            const newCache = new Map(prevCache);
            newCache.set(conversationId, allMessages);
            return newCache;
          });
          
          console.log('Loading messages - Server messages:', response.data.length);
          console.log('Loading messages - Cached temp messages:', tempMessages.length);
          console.log('Loading messages - Total messages:', allMessages.length);
          
          // Only update UI if forceReload is true or if we don't have cached messages
          if (forceReload || cachedMessages.length === 0) {
            return allMessages;
          } else {
            // Just update cache, don't change UI
            return prevMessages;
          }
        });
        
        setTimeout(() => {
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            const unreadMessages = response.data.filter(msg => 
              !msg.is_read && msg.sender_username !== user.username
            );
            
            if (unreadMessages.length > 0 && hasUnreadMessages) {
              const firstUnreadId = unreadMessages[0].id;
              const unreadElement = document.getElementById(`message-${firstUnreadId}`);
              if (unreadElement) {
                unreadElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                unreadElement.classList.add('bg-yellow-50', 'border-l-4', 'border-yellow-400', 'shadow-lg');
                unreadElement.style.animation = 'pulse-unread 1s ease-in-out 3';
                setTimeout(() => {
                  unreadElement.classList.remove('bg-yellow-50', 'border-l-4', 'border-yellow-400', 'shadow-lg');
                  unreadElement.style.animation = '';
                }, 4000);
              }
            } else {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }
        }, 100);
      } else {
        setError("Failed to load messages");
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async () => {
    if (!selectedChat || selectedChat.is_temp) return;

    try {
      await api.chat.markConversationRead(selectedChat.id);
      setMessages(prev => prev.map(msg => ({
        ...msg,
        is_read: true
      })));
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

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
        
        // Also update the cache
        if (selectedChat && selectedChat.id) {
          const conversationId = selectedChat.id.toString();
          setMessageCache(prevCache => {
            const newCache = new Map(prevCache);
            newCache.set(conversationId, updated);
            return newCache;
          });
        }
        
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
        
        try {
          const response = await api.chat.sendMessageNew(selectedChat.other_participant.email, messageContent);
          if (response.message_data) {
            console.log('Message sent successfully via API');
            setMessages(prev => {
              const updated = prev.map(msg => 
                msg.id === tempMessageId 
                  ? { 
                      ...msg, 
                      id: response.message_data.id,
                      is_temp: false,
                      timestamp: response.message_data.timestamp || msg.timestamp
                    }
                  : msg
              );
              
              // Also update the cache
              if (selectedChat && selectedChat.id) {
                const conversationId = selectedChat.id.toString();
                setMessageCache(prevCache => {
                  const newCache = new Map(prevCache);
                  newCache.set(conversationId, updated);
                  return newCache;
                });
              }
              
              return updated;
            });
          }
        } catch (error) {
          console.error("Error sending message via API:", error);
          // Keep the temporary message even if API fails, so user can see it
          console.log('API failed, keeping temporary message for retry');
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
      
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No conversation selected</h3>
          <p className="mt-1 text-sm text-gray-500">Choose a conversation from the sidebar to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* In-app notification toast */}
      {notification && (
        <div className="absolute top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                New message from {notification.sender}
              </p>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <ProfilePicture 
              user={selectedChat.other_participant}
              size="md"
            />
            {selectedChat.is_temp && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              {selectedChat.other_participant.full_name}
              {selectedChat.is_temp && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full shadow-sm">
                  New
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500">{selectedChat.other_participant.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {selectedChat.is_temp ? "New conversation" : formatTime(selectedChat.last_message_time)}
            </p>
          </div>
          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50/50 via-white/30 to-indigo-50/30 relative messages-container">
        {/* Scroll indicator */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-gray-300/50 to-transparent rounded-full opacity-50"></div>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button
                onClick={loadMessages}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:bg-indigo-100 px-3 py-1 rounded transition-all duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mb-2">
              Debug: {messages.length} messages in state
            </div>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100/80 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedChat.is_temp ? "Start a new conversation" : "No messages yet"}
                </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {selectedChat.is_temp 
                    ? "Send your first message to start chatting with this user." 
                    : "Be the first to send a message in this conversation."
                  }
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOutgoing = msg.sender_username === user.username;
                const isUnread = !msg.is_read && !isOutgoing;
                
                console.log('Rendering message:', msg);
                
                return (
                  <div
                    key={msg.id}
                    id={`message-${msg.id}`}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4 ${
                      isUnread ? 'unread-message' : ''
                    }`}
                  >
                    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
                      
                      {/* Message bubble */}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg message-bubble relative group ${
                          isOutgoing
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-white/90 backdrop-blur-sm text-gray-900 border border-gray-200/50 rounded-bl-md'
                        }`}
                      >
                        {msg.content && (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}
                        
                        <div className={`flex items-center justify-between mt-2 ${
                          isOutgoing ? 'text-indigo-100' : 'text-gray-400'
                        }`}>
                          <span className="text-xs">
                            {formatTime(msg.timestamp)}
                          </span>
                          <div className="flex items-center space-x-1">
                            {isOutgoing && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-200/50 p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <div className="relative">
              <input
                type="text"
                placeholder={sending ? "Sending..." : "Type a message..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
                className="w-full pl-4 pr-16 py-3 border border-gray-300/50 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all duration-200 message-input bg-white/80 backdrop-blur-sm shadow-sm"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sending}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    message.trim() && !sending
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md send-button-pulse'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {message.length > 0 && (
              <div className="absolute -bottom-6 right-0 text-xs text-gray-400">
                {message.length}/500
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
