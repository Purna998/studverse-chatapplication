import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import ProfilePicture from '../components/common/ProfilePicture';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon for users
const createUserIcon = (profilePicture, userName, isOnline) => {
  // Get initials for fallback
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(userName);
  
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="user-marker-container" title="${userName || 'User'}">
        ${profilePicture ? 
          `<img src="${profilePicture}" 
                alt="${userName || 'User'}" 
                class="user-marker-image"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : 
          ''
        }
        <div class="user-marker-initials ${profilePicture ? 'hidden' : 'flex'}">
          ${initials}
        </div>
        <div class="user-marker-online-indicator ${isOnline ? 'online' : 'offline'}"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Component to handle map center updates
const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  
  return null;
};

const NearbyMapPage = ({ onNavigateToChat, onNavigateBack }) => {
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India center
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const mapRef = useRef(null);

  // Request location permission and get user location
  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        setLoading(false);
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      const newLocation = { lat: latitude, lng: longitude };
      
      setUserLocation(newLocation);
      setMapCenter([latitude, longitude]);
      setLocationPermission('granted');
      
      // Update user's location in backend
      try {
        await api.admin.nearby.updateLocation(latitude, longitude);
        console.log('Location updated in backend');
      } catch (error) {
        console.error('Failed to update location in backend:', error);
      }
      
      // Load nearby users after getting location
      await loadNearbyUsers();
      
    } catch (error) {
      console.error('Error getting location:', error);
      if (error.code === 1) {
        setLocationPermission('denied');
        setError('Location permission denied. Please enable location access to see nearby users.');
      } else if (error.code === 2) {
        setError('Location unavailable. Please check your device location settings.');
      } else if (error.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Failed to get your location. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load nearby users from API
  const loadNearbyUsers = async () => {
    try {
      setLoading(true);
      
      const response = await api.admin.nearby.getNearbyUsers();
      
      if (response.data) {
        console.log('Nearby users data:', response.data);
        setNearbyUsers(response.data);
        if (response.user_location) {
          setMapCenter([response.user_location.lat, response.user_location.lng]);
        }
      } else if (response.error) {
        console.error("API Error:", response.error);
        setError(response.error);
      } else {
        console.error("No data in response:", response);
        setError("Failed to load nearby users");
      }
    } catch (error) {
      console.error('Error loading nearby users:', error);
      setError('Failed to load nearby users');
    } finally {
      setLoading(false);
    }
  };

  // Handle user marker click
  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Unknown';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return lastSeenDate.toLocaleDateString();
  };

  // Handle start chat
  const handleStartChat = (user) => {
    if (onNavigateToChat) {
      // Navigate to chat with the selected user and pass user data
      onNavigateToChat(user.email, {
        username: user.username,
        full_name: user.full_name,
        profile_picture: user.profile_picture,
        college: user.college
      });
    } else {
      // Fallback: open in new window or show alert
      alert(`Starting chat with ${user.full_name}`);
    }
  };

  // Initialize location on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Auto-refresh nearby users every 30 seconds
  useEffect(() => {
    if (locationPermission === 'granted') {
      const interval = setInterval(loadNearbyUsers, 30000);
      return () => clearInterval(interval);
    }
  }, [locationPermission]);

  if (loading && !userLocation) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (error && !userLocation) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Access Required</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={requestLocationPermission}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (onNavigateBack) {
                  onNavigateBack();
                } else {
                  window.history.back();
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Nearby Map</h1>
              <p className="text-sm text-gray-500">Find and chat with users near you</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* <button
              onClick={requestLocationPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>My Location</span>
            </button> */}
            
            <button
              onClick={loadNearbyUsers}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={15}
            className="w-full h-full"
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapUpdater center={mapCenter} />
            
            {/* Current user marker */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'current-user-marker',
                  html: `
                    <div class="current-user-marker-container">
                      <div class="current-user-marker-pulse"></div>
                      <div class="current-user-marker-dot"></div>
                    </div>
                  `,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">You are here</p>
                    <p className="text-sm text-gray-600">Your current location</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
                         {/* Nearby users markers */}
                           {nearbyUsers.map((user) => (
                <Marker
                  key={user.id}
                  position={[user.location.lat, user.location.lng]}
                  icon={createUserIcon(user.profile_picture, user.full_name, user.is_online)}
                  eventHandlers={{
                    click: () => handleUserClick(user)
                  }}
                >
                                 <Popup>
                   <div className="text-center min-w-[200px]">
                     <div className="flex justify-center mb-2">
                       <ProfilePicture 
                         user={user}
                         size="lg"
                       />
                     </div>
                                         <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                     <p className="text-sm text-gray-600">{user.college}</p>
                     <p className="text-xs text-gray-500">{user.distance} km away</p>
                     {user.is_online ? (
                       <p className="text-xs text-green-600 font-medium mb-3">🟢 Online</p>
                     ) : (
                       <p className="text-xs text-gray-500 mb-3">Last seen {formatLastSeen(user.last_seen)}</p>
                     )}
                    <button
                      onClick={() => handleStartChat(user)}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Chat
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Users List Section */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Nearby Users</h2>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading...' : `${nearbyUsers.length} users found`}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {nearbyUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedUser?.id === user.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                                 <div className="flex items-center space-x-3">
                   <ProfilePicture 
                     user={user}
                     size="lg"
                     showOnlineIndicator={true}
                     isOnline={user.is_online}
                   />
                  
                                     <div className="flex-1 min-w-0">
                     <h3 className="text-sm font-semibold text-gray-900 truncate">
                       {user.full_name}
                     </h3>
                     <p className="text-xs text-gray-500 truncate">{user.college}</p>
                     <p className="text-xs text-gray-400">{user.distance} km away</p>
                     {user.is_online ? (
                       <p className="text-xs text-green-600 font-medium">Online</p>
                     ) : (
                       <p className="text-xs text-gray-500">Last seen {formatLastSeen(user.last_seen)}</p>
                     )}
                   </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(user);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Chat
                  </button>
                </div>
              </div>
            ))}
            
            {nearbyUsers.length === 0 && !loading && (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500">No users found nearby</p>
                <p className="text-sm text-gray-400 mt-1">Try refreshing or expanding your search area</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                   <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
           <div className="flex items-center space-x-4 mb-4">
             <ProfilePicture 
               user={selectedUser}
               size="xl"
             />
                             <div>
                 <h3 className="text-lg font-semibold text-gray-900">{selectedUser.full_name}</h3>
                 <p className="text-sm text-gray-500">{selectedUser.email}</p>
                 <p className="text-sm text-gray-500">{selectedUser.college}</p>
                 <p className="text-xs text-gray-400">{selectedUser.distance} km away</p>
                 {selectedUser.is_online ? (
                   <p className="text-sm text-green-600 font-medium">🟢 Online</p>
                 ) : (
                   <p className="text-sm text-gray-500">Last seen {formatLastSeen(selectedUser.last_seen)}</p>
                 )}
               </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleStartChat(selectedUser)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Chat
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default NearbyMapPage; 