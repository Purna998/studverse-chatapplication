import React from "react";
import { ChatLayout } from "../components/chat/ChatLayout";

const ChatPage = ({ onNavigateToNearbyMap, invitationData }) => {
  return (
    <div className="h-screen">
      <ChatLayout 
        onNavigateToNearbyMap={onNavigateToNearbyMap} 
        invitationData={invitationData}
      />
    </div>
  );
};

export default ChatPage; 