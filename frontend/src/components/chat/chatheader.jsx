import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import TabSessionIndicator from "./TabSessionIndicator";
import ProfilePicture from "../common/ProfilePicture";

const ChatHeader = ({ onProfileToggle, showProfile, onNavigateToNearbyMap, onNavigateToForums, onNavigateToHome }) => {
  const { user, logout, tabId, isPrimaryTab } = useAuth();
  const [profileImageKey, setProfileImageKey] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);



  const handleLogout = () => {
    logout();
    window.location.reload(); // Refresh to go back to home
  };

  const handleHomeClick = () => {
    if (onNavigateToHome) onNavigateToHome();
  };

  const handleNearbyClick = () => {
    if (onNavigateToNearbyMap) onNavigateToNearbyMap();
  };

  const handleForumsClick = () => {
    if (onNavigateToForums) return onNavigateToForums();
    alert('Forums feature coming soon!');
  };

  // Update profile image key when user profile picture changes
  useEffect(() => {
    const profilePicture = user?.profile_picture || user?.profile?.profile_picture;
    console.log('Profile picture changed, updating key. New picture:', profilePicture);
    setProfileImageKey(prev => prev + 1);
  }, [user?.profile_picture, user?.profile?.profile_picture]);

  // Listen for real-time profile picture updates
  useEffect(() => {
    const handleProfilePictureUpdate = (event) => {
      console.log('Real-time profile picture update received:', event.detail);
      setIsUpdating(true);
      
      // Force immediate re-render of the profile picture
      setProfileImageKey(prev => prev + 1);
      
      // Update the user object immediately for this component
      if (event.detail.profilePicture) {
        // This will trigger the useEffect above and update the image
        console.log('Profile picture updated in real-time');
      }
      
      // Remove updating state after a short delay
      setTimeout(() => {
        setIsUpdating(false);
      }, 1000);
    };

    const handleUserDataUpdate = (event) => {
      console.log('User data update received:', event.detail);
      // Force immediate re-render of the profile picture
      setProfileImageKey(prev => prev + 1);
      
      if (event.detail.changes.profile_picture) {
        console.log('Profile picture updated via userDataUpdated event');
      }
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('userDataUpdated', handleUserDataUpdate);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, []);

  // Get display name with fallbacks - prioritize full name
  const getDisplayName = () => {
    if (!user) return 'User';
    
    // First try to construct full name from first_name and last_name
    const constructedFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    
    // Priority order: constructed full name > full_name field > username
    return constructedFullName || user.full_name || user.username || 'User';
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-900">STUDVERSE</span>
      </div>

      {/* Center Navigation - Features */}
      <div className="flex-1 flex items-center justify-center space-x-8">
        {/* Home */}
        <button 
          onClick={handleHomeClick}
          className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all duration-200 group hover:shadow-md"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 14V9m0 0l-5 5m5-5l5 5" />
          </svg>
          <span className="text-sm font-medium">Home</span>
        </button>

        {/* Nearby Map */}
        <button 
          onClick={handleNearbyClick}
          className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all duration-200 group hover:shadow-md"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">Nearby</span>
        </button>

        {/* Forums */}
        <button 
          onClick={handleForumsClick}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-all duration-200 group hover:shadow-md"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm font-medium">Forums</span>
        </button>
      </div>

      {/* Right Side - User Info and Actions */}
      <div className="flex items-center space-x-4">
        

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
            <div className="flex items-center space-x-1">
              
              <TabSessionIndicator />
            </div>
          </div>
          <button
            onClick={onProfileToggle}
            className={`relative p-1 rounded-full transition-all duration-200 hover:shadow-lg ${
              showProfile 
                ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-105' 
                : 'hover:bg-gray-100 hover:scale-105'
            }`}
            title={showProfile ? "Hide Profile" : "Show Profile"}
          >
            <ProfilePicture 
              user={user}
              size="sm"
              className={`transition-all duration-300 ${isUpdating ? 'animate-pulse opacity-75' : ''}`}
              key={`${user?.profile_picture || user?.profile?.profile_picture}-${profileImageKey}-${Date.now()}`}
            />
            
            {/* Update indicator */}
            {isUpdating && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-25 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            <div className={`absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
              showProfile ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}>
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 hover:shadow-md"
          title="Logout"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
