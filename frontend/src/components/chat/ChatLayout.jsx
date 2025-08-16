import React, { useState, useEffect } from "react";
import ChatHeader from "./chatheader";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import GroupChat from "./GroupChat";
import UserProfile from "./UserProfile";
import Forums from "./Forums";
import { api } from "../../utils/api";

export const ChatLayout = ({ onNavigateToNearbyMap, invitationData }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'groups' | 'forums'

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setSelectedGroup(null); // Clear group selection when selecting a chat
    setActiveView('chat');
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setSelectedChat(null); // Clear chat selection when selecting a group
    setActiveView('groups');
  };

  const handleMessageSent = (updatedChat) => {
    if (updatedChat === null) {
      // This indicates a conversation refresh is needed
      console.log('ChatLayout: Conversation refresh requested');
      return;
    }
    setSelectedChat(updatedChat);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

  // Header actions
  const handleNavigateToForums = () => setActiveView('forums');
  const handleNavigateToGroups = () => setActiveView('groups');
  const handleNavigateToHome = () => {
    setActiveView('chat');
    setSelectedGroup(null);
    // keep selectedChat as is or clear to show conversation list
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showProfile) {
        setShowProfile(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProfile]);

  // Check for invitation data
  useEffect(() => {
    if (invitationData?.forumId) {
      // Navigate to forums view to handle the invitation
      setActiveView('forums');
    }
  }, [invitationData]);

  // Check for user email from nearby map navigation
  useEffect(() => {
    const chatWithUser = sessionStorage.getItem('chat_with_user');
    const userData = sessionStorage.getItem('chat_with_user_data');
    
    if (chatWithUser) {
      // Clear the sessionStorage
      sessionStorage.removeItem('chat_with_user');
      sessionStorage.removeItem('chat_with_user_data');
      
      // Parse user data if available
      let parsedUserData = null;
      if (userData) {
        try {
          parsedUserData = JSON.parse(userData);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Check if conversation already exists by looking through existing conversations
      const checkExistingConversation = async () => {
        try {
          const response = await api.chat.getConversations();
          if (response.data) {
            const existingConversation = response.data.find(conv => 
              conv.other_participant.email === chatWithUser
            );
            
            if (existingConversation) {
              // Use existing conversation
              setSelectedChat(existingConversation);
              setActiveView('chat');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking existing conversations:', error);
        }
        
        // If no existing conversation found, create a temporary one
        const tempConversation = {
          id: `temp_${Date.now()}`,
          other_participant: {
            email: chatWithUser,
            username: parsedUserData?.username || chatWithUser.split('@')[0],
            full_name: parsedUserData?.full_name || chatWithUser.split('@')[0],
            profile_picture: parsedUserData?.profile_picture || null
          },
          last_message: "",
          last_message_time: new Date().toISOString(),
          unread_count: 0,
          is_temp: true
        };
        
        setSelectedChat(tempConversation);
        setActiveView('chat');
      };
      
      checkExistingConversation();
    }
  }, []);

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <ChatHeader 
        onProfileToggle={toggleProfile}
        showProfile={showProfile}
        onNavigateToNearbyMap={onNavigateToNearbyMap}
        onNavigateToForums={handleNavigateToForums}
        onNavigateToHome={handleNavigateToHome}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (hidden in Forums view) */}
        {activeView !== 'forums' && (
          <div className="w-80 bg-white border-r border-gray-200 shadow-sm flex flex-col">
            <Sidebar 
              selectedChat={selectedChat}
              onChatSelect={handleChatSelect}
              selectedGroup={selectedGroup}
              onGroupSelect={handleGroupSelect}
            />
          </div>
        )}

        {/* Main Window */}
        <div className="flex-1 flex flex-col bg-white">
          {activeView === 'forums' ? (
            <Forums />
          ) : selectedGroup ? (
            <GroupChat 
              group={selectedGroup}
              onBack={handleBackToGroups}
            />
          ) : (
            <ChatWindow 
              selectedChat={selectedChat} 
              onMessageSent={handleMessageSent}
            />
          )}
        </div>

        {/* Right Sidebar - User Profile */}
        {showProfile && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setShowProfile(false)}
            />
            <div className="w-80 bg-white border-l border-gray-200 transform transition-all duration-300 ease-in-out z-50 relative shadow-lg">
              <UserProfile onClose={() => setShowProfile(false)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 