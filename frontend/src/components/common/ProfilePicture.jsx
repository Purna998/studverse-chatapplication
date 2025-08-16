import React from 'react';

const ProfilePicture = ({ 
  user, 
  size = 'md', 
  className = '', 
  showOnlineIndicator = false,
  isOnline = false 
}) => {
  // Get profile picture URL from user data
  const getProfilePictureUrl = () => {
    const profilePicture = user?.profile_picture || user?.profile?.profile_picture;
    
    console.log('ProfilePicture component - User data:', user);
    console.log('ProfilePicture component - Profile picture URL:', profilePicture);
    
    if (profilePicture) {
      // Add cache busting parameter to ensure fresh image loads
      const separator = profilePicture.includes('?') ? '&' : '?';
      const url = `${profilePicture}${separator}t=${Date.now()}`;
      console.log('ProfilePicture component - Final URL:', url);
      return url;
    }
    
    console.log('ProfilePicture component - No profile picture found, will show initials');
    return null;
  };

  // Get user's initials
  const getInitials = () => {
    if (!user) {
      console.log('ProfilePicture component - No user data, showing ?');
      return '?';
    }
    
    const fullName = user.full_name || user.first_name || user.username || '';
    console.log('ProfilePicture component - Full name for initials:', fullName);
    
    if (!fullName) {
      const usernameInitial = user.username?.charAt(0)?.toUpperCase() || '?';
      console.log('ProfilePicture component - Using username initial:', usernameInitial);
      return usernameInitial;
    }
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      const initial = names[0].charAt(0).toUpperCase();
      console.log('ProfilePicture component - Single name initial:', initial);
      return initial;
    }
    
    const initials = (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    console.log('ProfilePicture component - Multiple name initials:', initials);
    return initials;
  };

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  const profilePictureUrl = getProfilePictureUrl();
  const initials = getInitials();

  console.log('ProfilePicture component - Rendering with:', {
    profilePictureUrl,
    initials,
    size,
    className
  });

  return (
    <div className={`relative ${className}`}>
      {profilePictureUrl ? (
        // Show uploaded profile picture
        <img
          src={profilePictureUrl}
          alt={`${user?.full_name || user?.username || 'User'} profile`}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-md`}
          onError={(e) => {
            console.log('Profile picture failed to load, showing initials');
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
          onLoad={() => {
            console.log('Profile picture loaded successfully');
          }}
        />
      ) : null}
      
      {/* Fallback initials display */}
      <div 
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md border-2 border-white ${
          profilePictureUrl ? 'hidden' : 'flex'
        }`}
        style={{ display: profilePictureUrl ? 'none' : 'flex' }}
      >
        {initials}
      </div>
      
      {/* Online indicator */}
      {showOnlineIndicator && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      )}
    </div>
  );
};

export default ProfilePicture;
