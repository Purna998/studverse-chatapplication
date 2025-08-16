import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import GroupsList from "./GroupsList";
import CreateGroupModal from "./CreateGroupModal";
import websocketManager from "../../utils/websocket";
import ProfilePicture from "../common/ProfilePicture";

// Trie Node class for efficient string searching
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.conversationIds = new Set();
  }
}

// Trie class for conversation search
class ConversationTrie {
  constructor() {
    this.root = new TrieNode();
  }

  // Insert a word (search term) with associated conversation ID
  insert(word, conversationId) {
    let node = this.root;
    const lowerWord = word.toLowerCase();
    
    for (let char of lowerWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
      node.conversationIds.add(conversationId);
    }
    node.isEndOfWord = true;
  }

  // Search for conversations that match the prefix
  search(prefix) {
    let node = this.root;
    const lowerPrefix = prefix.toLowerCase();
    
    // Navigate to the node representing the prefix
    for (let char of lowerPrefix) {
      if (!node.children.has(char)) {
        return new Set(); // No matches found
      }
      node = node.children.get(char);
    }
    
    return node.conversationIds;
  }

  // Build trie from conversations
  buildFromConversations(conversations) {
    // Clear existing trie
    this.root = new TrieNode();
    
    conversations.forEach(conversation => {
      const otherParticipant = conversation.other_participant;
      
      // Insert searchable terms for each conversation
      const searchTerms = [
        otherParticipant?.full_name || '',
        otherParticipant?.username || '',
        otherParticipant?.first_name || '',
        otherParticipant?.last_name || '',
        otherParticipant?.email || '',
        conversation.last_message?.content || ''
      ].filter(term => term.trim() !== '');
      
      searchTerms.forEach(term => {
        this.insert(term, conversation.id);
      });
    });
  }
}

const Sidebar = ({ selectedChat, onChatSelect, selectedGroup, onGroupSelect }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unifiedSearch, setUnifiedSearch] = useState(""); // Single search field for both conversations and users
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'groups'
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const { user } = useAuth();

  // Create trie instance
  const conversationTrie = useMemo(() => new ConversationTrie(), []);

  // Build trie when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      conversationTrie.buildFromConversations(conversations);
    }
  }, [conversations, conversationTrie]);

  // Handle unified search - auto-detect if searching for user or filtering conversations
  useEffect(() => {
    if (unifiedSearch.trim()) {
      // Check if it looks like an email (contains @)
      if (unifiedSearch.includes('@')) {
        // Auto-search for user by email
        const searchUser = async () => {
          try {
            setSearching(true);
            const response = await api.chat.searchUserByEmail(unifiedSearch.trim());
            
            if (response.found) {
              setSearchResult(response.user);
            } else {
              setSearchResult({ notFound: true, message: response.message });
            }
          } catch (error) {
            console.error("Error searching user:", error);
            setSearchResult({ error: "Failed to search user" });
          } finally {
            setSearching(false);
          }
        };
        searchUser();
      } else {
        // Clear any previous user search result when filtering conversations
        setSearchResult(null);
      }
    } else {
      // Clear search results when search is empty
      setSearchResult(null);
    }
  }, [unifiedSearch]);

  // Filter conversations based on search term
  const filteredConversations = useMemo(() => {
    if (!unifiedSearch.trim()) {
      return conversations;
    }
    
    // If searching for email (user search), show all conversations
    if (unifiedSearch.includes('@')) {
      return conversations;
    }
    
    // For conversation filtering, use Trie search
    const matchingIds = conversationTrie.search(unifiedSearch);
    return conversations.filter(conversation => matchingIds.has(conversation.id));
  }, [conversations, unifiedSearch, conversationTrie]);

  // Load conversations on component mount
  useEffect(() => {
    if (activeTab === 'conversations') {
      loadConversations();
    }
  }, [activeTab]);

  // Request notification permission and WebSocket connection
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Connect to WebSocket
    websocketManager.connect();
    
    // Add message handler for real-time conversation updates
    const handleWebSocketMessage = (data) => {
      console.log('Sidebar: WebSocket message received:', data);
      
      // Handle conversation refresh notifications
      if (data.type === 'conversation_refresh') {
        console.log('Sidebar: New conversation detected, refreshing conversations');
        console.log('Sidebar: Refresh data:', data);
        
        // Show notification for new conversation
        if (Notification.permission === 'granted') {
          const senderName = data.sender_full_name || data.sender || 'Someone';
          new Notification(`New conversation from ${senderName}`, {
            body: 'You have a new conversation!',
            icon: '/vite.svg',
            tag: `conversation-${data.sender}`,
            requireInteraction: false
          });
        }
        
        // Refresh conversations list immediately
        loadConversations();
        return;
      }
      
      // Check if this message is for the current user (as receiver)
      const isMessageForCurrentUser = data.receiver === user.username;
      const isMessageFromCurrentUser = data.sender === user.username;
      
      // Handle new messages for current user
      if (isMessageForCurrentUser && !isMessageFromCurrentUser) {
        console.log('Sidebar: New message for current user detected');
        console.log('Sidebar: Message data:', data);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          const senderName = data.sender_full_name || data.sender || 'Someone';
          new Notification(`New message from ${senderName}`, {
            body: data.message,
            icon: '/vite.svg',
            tag: `message-${data.sender}`,
            requireInteraction: false
          });
        }
        
        // Immediately update conversations list to show the new message
        setConversations(prevConversations => {
          const updatedConversations = prevConversations.map(conv => {
            // Check if this conversation matches the message
            if (conv.id.toString() === data.conversation_id?.toString()) {
              console.log('Sidebar: Updating conversation with new message:', conv.id);
              return {
                ...conv,
                last_message: {
                  content: data.message,
                  timestamp: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
                  sender_username: data.sender
                },
                last_message_time: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
                unread_count: (conv.unread_count || 0) + 1
              };
            }
            return conv;
          });
          
          // If conversation doesn't exist in list, it might be a new conversation
          const conversationExists = updatedConversations.some(conv => 
            conv.id.toString() === data.conversation_id?.toString()
          );
          
          if (!conversationExists && data.is_new_conversation) {
            console.log('Sidebar: New conversation detected, will refresh full list');
            // For new conversations, refresh the full list to get complete data
            setTimeout(() => loadConversations(), 100);
            return prevConversations;
          }
          
          return updatedConversations;
        });
        
        // Also refresh from server to ensure we have the latest data
        setTimeout(() => loadConversations(), 500);
        
        // Force a re-render to ensure UI updates immediately
        setConversations(prev => [...prev]);
      }
      
      // Handle sent messages (for sender confirmation)
      if (isMessageFromCurrentUser && (data.type === 'message_sent' || data.message_type === 'message_sent')) {
        console.log('Sidebar: Message sent confirmation received');
        console.log('Sidebar: Sent message data:', data);
        
        // Refresh conversations list to show the sent message
        loadConversations();
      }
    };

    websocketManager.addMessageHandler(handleWebSocketMessage);

    // Cleanup
    return () => {
      websocketManager.removeMessageHandler(handleWebSocketMessage);
    };
  }, [activeTab, user.username]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('Loading conversations...');
      const response = await api.chat.getConversations();
      console.log('Conversations response:', response);
      
      // Handle new response format with tab session info
      if (response.data) {
        setConversations(response.data);
        console.log('Conversations loaded:', response.data);
        
        // Log tab session info for debugging
        if (response.tab_session) {
          console.log('Tab Session Info:', response.tab_session);
        }
      } else if (response.error) {
        console.error("API Error:", response.error);
        setError("Failed to load conversations");
      } else {
        console.error("No data in response:", response);
        setError("Failed to load conversations");
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };



  const handleStartConversation = async (userEmail) => {
    try {
      // Create a temporary conversation object for immediate UI feedback
      const tempConversation = {
        id: `temp_${Date.now()}`,
        other_participant: {
          username: searchResult.username,
          email: searchResult.email,
          full_name: searchResult.full_name,
          profile_picture: searchResult.profile_picture
        },
        last_message: "",
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        is_temp: true
      };

      // Add to conversations list
      setConversations(prev => [tempConversation, ...prev]);
      
      // Select the new conversation
      onChatSelect(tempConversation);
      
      // Clear search
      setUnifiedSearch("");
      setSearchResult(null);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const handleConversationSelect = (conversation) => {
    // Check if conversation has unread messages
    const hasUnreadMessages = conversation.last_message && 
                             !conversation.last_message.is_read && 
                             conversation.last_message.sender_id !== user?.id;
    
    // Add a flag to indicate if we should scroll to unread messages
    const conversationWithUnreadFlag = {
      ...conversation,
      hasUnreadMessages: hasUnreadMessages
    };
    
    onChatSelect(conversationWithUnreadFlag);
  };

  const handleGroupCreated = (newGroup) => {
    // Refresh groups list
    setActiveTab('groups');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && activeTab === 'conversations') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200/50">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200/50 bg-white/50">
        <button
          onClick={() => setActiveTab('conversations')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'conversations'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
          }`}
        >
          Conversations
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'groups'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
          }`}
        >
          Groups
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'conversations' ? (
        <>
                     {/* Unified Search */}
           <div className="p-4 border-b border-gray-200/50 bg-white/30">
             <div className="space-y-3">
               {/* Unified Search Input */}
               <div className="space-y-2">
                 <div className="relative">
                   <input
                     type="text"
                     placeholder="Search conversations or users by email..."
                     value={unifiedSearch}
                     onChange={(e) => setUnifiedSearch(e.target.value)}
                     className="w-full pl-10 pr-12 py-2 border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm"
                   />
                   <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                   {unifiedSearch && (
                     <button 
                       onClick={() => {
                         setUnifiedSearch("");
                         setSearchResult(null);
                       }}
                       className="absolute right-10 top-2 p-1 text-gray-400 hover:text-gray-600 transition-all duration-200"
                     >
                       <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   )}
                   <div className="absolute right-2 top-2 p-1 text-gray-400">
                     {searching ? (
                       <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                     ) : (
                       <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                     )}
                   </div>
                 </div>

                 {/* Search results info for conversations */}
                 {unifiedSearch && !searchResult && (
                   <div className="text-xs text-gray-500">
                     {filteredConversations.length === conversations.length 
                       ? `Showing all ${conversations.length} conversations`
                       : `Found ${filteredConversations.length} of ${conversations.length} conversations`
                     }
                   </div>
                 )}
                 
                 {/* Search results info when user search is active */}
                 {unifiedSearch && searchResult && (
                   <div className="text-xs text-gray-500">
                     Showing all {conversations.length} conversations
                   </div>
                 )}
               </div>
             </div>
           </div>

           {/* User Search Result - Fixed Position Above Conversation List */}
           {searchResult && (
             <div className="p-4 border-b border-gray-200/50 bg-indigo-50/30">
               <div className="bg-indigo-50/80 border border-indigo-200/50 rounded-lg p-3 shadow-sm">
                 {searchResult.notFound ? (
                   <p className="text-red-600 text-sm">{searchResult.message}</p>
                 ) : searchResult.error ? (
                   <p className="text-red-600 text-sm">{searchResult.error}</p>
                 ) : (
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                       <ProfilePicture 
                         user={searchResult}
                         size="sm"
                       />
                       <div>
                         <p className="text-sm font-medium text-gray-900">
                           {searchResult.full_name || searchResult.username || "Unknown User"}
                         </p>
                         <p className="text-xs text-gray-500">{searchResult.email}</p>
                       </div>
                     </div>
                     <button
                       onClick={() => handleStartConversation(searchResult.email)}
                       className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:bg-indigo-100 px-2 py-1 rounded transition-all duration-200"
                     >
                       Start Chat
                     </button>
                   </div>
                 )}
               </div>
             </div>
           )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto bg-white/30">
            {error && (
              <div className="p-4 text-center">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={loadConversations}
                  className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:bg-indigo-100 px-3 py-1 rounded transition-all duration-200"
                >
                  Retry
                </button>
              </div>
            )}

            {filteredConversations.length === 0 && !error ? (
              <div className="p-4 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  {unifiedSearch ? 'No conversations match your search' : 'No conversations yet'}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {unifiedSearch ? 'Try different keywords or search for users by email' : 'Start chatting with other users'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                // Handle new conversation structure from backend
                const otherParticipant = conversation.other_participant;
                const lastMessage = conversation.last_message;
                
                // Debug logging to see what data we're getting
                console.log('Conversation data:', {
                  id: conversation.id,
                  otherParticipant: otherParticipant,
                  lastMessage: lastMessage
                });
                
                // Better fallback logic for user display
                const displayName = otherParticipant?.full_name || 
                                  otherParticipant?.username || 
                                  otherParticipant?.first_name || 
                                  otherParticipant?.last_name || 
                                  "Unknown User";
                
                const displayUsername = otherParticipant?.username || "unknown";
                
                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`flex items-center p-4 hover:bg-white/60 cursor-pointer transition-all duration-200 ${
                      selectedChat?.id === conversation.id ? 'bg-indigo-50/80 border-r-2 border-indigo-500 shadow-sm' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <ProfilePicture 
                        user={otherParticipant}
                        size="lg"
                      />
                      {conversation.is_temp && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 border-2 border-white rounded-full shadow-sm"></div>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 ml-3 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {displayName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.updated_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {lastMessage ? lastMessage.content : "No messages yet"}
                      </p>
                    </div>

                    {/* Unread Badge */}
                    {lastMessage && !lastMessage.is_read && lastMessage.sender_id !== user?.id && (
                      <div className="ml-2 bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-sm animate-pulse">
                        {conversation.unread_count || 1}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          {/* Groups Header */}
          <div className="p-4 border-b border-gray-200/50 bg-white/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto bg-white/30">
            <GroupsList
              onGroupSelect={onGroupSelect}
              selectedGroupId={selectedGroup?.id}
            />
          </div>
        </>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default Sidebar;
