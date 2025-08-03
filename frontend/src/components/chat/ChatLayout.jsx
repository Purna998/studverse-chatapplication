import React, { useState } from "react";
import ChatHeader from "./chatheader";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import UserProfile from "./UserProfile";

export const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <ChatHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Sidebar 
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
            searchQuery={searchQuery}
          />
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          <ChatWindow selectedChat={selectedChat} />
        </div>

        {/* Right Sidebar - User Profile */}
        <div className="w-80 bg-white border-l border-gray-200">
          <UserProfile />
        </div>
      </div>
    </div>
  );
}; 