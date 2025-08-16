import React, { useState, useEffect, useRef } from 'react';
import { groupAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import GroupSettings from './GroupSettings';

const GroupChat = ({ group, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (group) {
      loadMessages();
      loadMembers();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        console.log('🧹 Cleaning up WebSocket connection...');
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [group]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log('🔌 Closing existing WebSocket connection...');
      wsRef.current.close();
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('❌ No access token found for WebSocket connection');
      return;
    }

    const wsUrl = `ws://localhost:8000/ws/group/${group.id}/?token=${token}`;
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('✅ Connected to group chat WebSocket for group:', group.id);
      setWsConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        
        if (data.type === 'group_message') {
          const newMessage = data.message;
          console.log('➕ Adding new message to UI:', newMessage);
          
          // Check if message already exists to avoid duplicates
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              console.log('⚠️ Message already exists, skipping:', newMessage.id);
              return prev;
            }
            console.log('✅ Adding new message:', newMessage.id);
            return [...prev, newMessage];
          });
        } else if (data.type === 'connection_established') {
          console.log('✅ Group chat connection established');
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    wsRef.current.onclose = (event) => {
      console.log('🔌 Disconnected from group chat WebSocket. Code:', event.code, 'Reason:', event.reason);
      setWsConnected(false);
      
      // Don't reconnect if it was a normal closure or if component is unmounting
      if (event.code === 1000 || event.code === 1001) {
        console.log('✅ Normal WebSocket closure, not reconnecting');
        return;
      }
      
      // Attempt to reconnect after a delay (with exponential backoff)
      const reconnectDelay = Math.min(3000 * Math.pow(2, Math.min(5, 0)), 30000); // Max 30 seconds
      console.log(`🔄 Attempting to reconnect in ${reconnectDelay}ms...`);
      
      setTimeout(() => {
        if (group && wsRef.current?.readyState === WebSocket.CLOSED) {
          console.log('🔄 Reconnecting...');
          connectWebSocket();
        }
      }, reconnectDelay);
    };
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== LOAD GROUP MESSAGES DEBUG ===');
      console.log('Loading messages for group:', group.id, group.name);
      
      const response = await groupAPI.getGroupMessages(group.id);
      console.log('Messages response:', response);
      
      if (response.success) {
        console.log('Messages loaded successfully:', response.data);
        console.log('Debug info:', response.debug_info);
        setMessages(response.data);
      } else {
        console.error('Failed to load messages:', response.error);
        setError(response.error || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      console.log('=== END LOAD GROUP MESSAGES DEBUG ===');
    }
  };

  const loadMembers = async () => {
    try {
      const response = await groupAPI.getGroupMembers(group.id);
      if (response.success) {
        setMembers(response.data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !attachment) return;

    setSending(true);
    try {
      console.log('🚀 === SEND GROUP MESSAGE DEBUG ===');
      console.log('📤 Sending message to group:', group.id, group.name);
      console.log('💬 Message:', newMessage);
      console.log('📎 Attachment:', attachment);
      
      // Add message to UI immediately for better UX
      const tempMessage = {
        id: `temp_${Date.now()}`,
        content: newMessage,
        sender_username: user.username,
        sender_full_name: user.full_name || user.username,
        timestamp: new Date().toISOString(),
        is_read: false,
        is_temp: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Send via WebSocket for real-time delivery
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('📡 Sending via WebSocket...');
        wsRef.current.send(JSON.stringify({
          type: 'message',
          message: newMessage
        }));
      } else {
        console.log('⚠️ WebSocket not available, sending via API only');
      }
      
      // Also send via API for persistence
      console.log('📡 Sending via API...');
      const response = await groupAPI.sendGroupMessage(group.id, newMessage, attachment);
      console.log('📨 Send message response:', response);
      
      if (response.success) {
        console.log('✅ Message sent successfully:', response.data);
        console.log('🔍 Debug info:', response.debug_info);
        
        // Replace temporary message with real message from server
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? response.data : msg
        ));
        
        setNewMessage('');
        setAttachment(null);
        setAttachmentPreview(null);
        setError(null); // Clear any previous errors
      } else {
        console.error('❌ Failed to send message:', response.error);
        setError(response.error || 'Failed to send message');
        // Remove the temporary message if API failed
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError(error.message || 'Failed to send message');
      // Remove the temporary message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    } finally {
      setSending(false);
      console.log('🏁 === END SEND GROUP MESSAGE DEBUG ===');
    }
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachmentPreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return '🖼️';
    } else if (file.type === 'application/pdf') {
      return '📄';
    } else if (file.type.includes('document') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      return '📝';
    } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      return '📊';
    } else if (file.type.includes('presentation') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
      return '📈';
    } else {
      return '📎';
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRemoveMember = async (userId) => {
    try {
      const response = await groupAPI.removeGroupMember(group.id, userId);
      if (response.success) {
        loadMembers();
      } else {
        setError(response.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member');
    }
  };

  const handlePromoteMember = async (userId) => {
    try {
      const response = await groupAPI.promoteGroupMember(group.id, userId);
      if (response.success) {
        loadMembers();
      } else {
        setError(response.error || 'Failed to promote member');
      }
    } catch (error) {
      console.error('Error promoting member:', error);
      setError('Failed to promote member');
    }
  };

  const isAdmin = members.find(m => m.user === user?.id)?.role === 'admin';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-3">
            {group.image ? (
              <img
                src={group.image}
                alt={group.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-500">{group.member_count} members</p>
                <div className={`flex items-center space-x-1 ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs font-medium">
                    {wsConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          {error && (
            <div className="p-3 bg-red-50 border-b border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender !== user?.id && (
                    <div className="flex-shrink-0 mr-2">
                      <img
                        src={message.sender_profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"}
                        alt={message.sender_username}
                        className="w-8 h-8 rounded-full object-cover shadow-sm"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face";
                        }}
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    } ${message.is_temp ? 'opacity-75' : ''}`}
                  >
                    {message.sender !== user?.id && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.sender_username}
                        </span>
                      </div>
                    )}
                    
                    {message.message && (
                      <p className="text-sm">{message.message}</p>
                    )}
                    
                    {message.attachment_url && (
                      <div className="mt-2">
                        {message.attachment_url.includes('image') ? (
                          <img 
                            src={message.attachment_url} 
                            alt="Attachment" 
                            className="max-w-full max-h-48 rounded object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(message.attachment_url, '_blank')}
                          />
                        ) : (
                          <a 
                            href={message.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200"
                          >
                            <span className="text-lg">📎</span>
                            <span className="text-sm">View Attachment</span>
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className={`flex items-center justify-between mt-1 ${
                      message.sender === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.is_temp && (
                        <span className="text-xs flex items-center">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1"></div>
                          Sending...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            {attachment && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileIcon(attachment)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                      <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={removeAttachment}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {attachmentPreview && (
                  <div className="mt-2">
                    <img src={attachmentPreview} alt="Preview" className="max-w-xs max-h-32 rounded object-cover" />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachment}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              />

              <button
                onClick={sendMessage}
                disabled={sending || (!newMessage.trim() && !attachment)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-200 bg-gray-50">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <div className="flex items-center space-x-2">
                      {member.profile_picture ? (
                        <img
                          src={member.profile_picture}
                          alt={member.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            {member.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.username}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    
                    {isAdmin && member.user !== user?.id && (
                      <div className="flex space-x-1">
                        {member.role === 'member' && (
                          <button
                            onClick={() => handlePromoteMember(member.user)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Promote to admin"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.user)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group Settings Modal */}
      {showSettings && (
        <GroupSettings
          group={group}
          onClose={() => setShowSettings(false)}
          onGroupUpdated={(updatedGroup) => {
            // Update the group data
            Object.assign(group, updatedGroup);
            setShowSettings(false);
          }}
          onGroupDeleted={(groupId) => {
            // Navigate back when group is deleted
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default GroupChat; 