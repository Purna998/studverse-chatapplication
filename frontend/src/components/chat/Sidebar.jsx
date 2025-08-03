import React from "react";

const Sidebar = ({ selectedChat, onChatSelect, searchQuery }) => {
  // Mock conversation data
  const conversations = [
    {
      id: 1,
      name: "You",
      lastMessage: "It's like a magic",
      timestamp: "18:52",
      unreadCount: 0,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      isOnline: true
    },
    {
      id: 2,
      name: "Pratik sir",
      lastMessage: "Hello sir!",
      timestamp: "18:52",
      unreadCount: 3,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      isOnline: false
    },
    {
      id: 3,
      name: "Naman sir",
      lastMessage: "It's already done sir",
      timestamp: "18:52",
      unreadCount: 2,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
      isOnline: true
    },
    {
      id: 4,
      name: "Sanjiv sir",
      lastMessage: "Great work!",
      timestamp: "18:52",
      unreadCount: 1,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      isOnline: false
    },
    {
      id: 5,
      name: "Prakash sir",
      lastMessage: "Meeting at 3 PM",
      timestamp: "18:52",
      unreadCount: 9,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      isOnline: true
    },
    {
      id: 6,
      name: "Chaturbhuj sir",
      lastMessage: "Project deadline extended",
      timestamp: "18:52",
      unreadCount: 0,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      isOnline: false
    },
    {
      id: 7,
      name: "Narendra sir",
      lastMessage: "Code review completed",
      timestamp: "18:52",
      unreadCount: 0,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
      isOnline: true
    },
    {
      id: 8,
      name: "Adu..",
      lastMessage: "New assignment posted",
      timestamp: "18:52",
      unreadCount: 0,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      isOnline: false
    },
    {
      id: 9,
      name: "Raju..",
      lastMessage: "Group study session",
      timestamp: "18:52",
      unreadCount: 0,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      isOnline: true
    }
  ];

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search and New Chat */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button className="absolute right-2 top-2 p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onChatSelect(conversation)}
            className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
              selectedChat?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <img
                src={conversation.avatar}
                alt={conversation.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {conversation.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>

            {/* Conversation Info */}
            <div className="flex-1 ml-3 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {conversation.name}
                </h3>
                <span className="text-xs text-gray-500">{conversation.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600 truncate mt-1">
                {conversation.lastMessage}
              </p>
            </div>

            {/* Unread Badge */}
            {conversation.unreadCount > 0 && (
              <div className="ml-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {conversation.unreadCount}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
