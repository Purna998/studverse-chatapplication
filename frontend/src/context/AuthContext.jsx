import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import tabManager from '../utils/tabManager';

const defaultAuthContext = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: () => {},
  fetchUserProfile: async () => null,
  tabId: null,
  sessionKey: null,
  isPrimaryTab: () => true,
  refreshAuth: () => {},
  updateUserData: () => {}
};

const AuthContext = createContext(defaultAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabId] = useState(tabManager.getTabId());
  const [sessionKey] = useState(tabManager.getSessionKey());

  // Function to fetch user profile and check admin status
  const fetchUserProfile = async () => {
    try {
      console.log('AuthContext: Fetching user profile...');
      const response = await api.getUserProfile();
      console.log('AuthContext: User profile response:', response);
      
      if (response.data) {
        const userData = {
          ...response.data,
          isAdmin: response.data.is_admin || false,
          tabId: tabId,
          sessionKey: sessionKey
        };
        console.log('AuthContext: Setting user data:', userData);
        setUser(userData);
        setIsAdmin(response.data.is_admin || false);
        
        // Store user data in session-specific storage
        sessionStorage.setItem(`${sessionKey}_user`, JSON.stringify(userData));
        
        return userData;
      } else {
        console.error('AuthContext: No data in user profile response:', response);
      }
    } catch (error) {
      console.error('AuthContext: Error fetching user profile:', error);
      // If profile fetch fails, try to create a basic user object from localStorage
      const username = localStorage.getItem('username');
      if (username) {
        console.log('AuthContext: Creating basic user data for username:', username);
        const basicUserData = { 
          username,
          tabId: tabId,
          sessionKey: sessionKey
        };
        setUser(basicUserData);
        setIsAdmin(false); // Default to non-admin if we can't verify
        
        // Store basic user data in session-specific storage
        sessionStorage.setItem(`${sessionKey}_user`, JSON.stringify(basicUserData));
        
        return basicUserData;
      }
    }
    return null;
  };

  useEffect(() => {
    // Function to check authentication status
    const checkAuthStatus = () => {
      console.log('AuthContext: Checking authentication status...');
      // Use sessionStorage for authentication tokens to isolate sessions
      const token = sessionStorage.getItem(`${sessionKey}_access_token`) || localStorage.getItem('access_token');
      const username = sessionStorage.getItem(`${sessionKey}_username`) || localStorage.getItem('username');
      
      console.log('AuthContext: Token and username found:', { 
        hasToken: !!token, 
        username: username,
        sessionKey: sessionKey 
      });
      
      // Check for session-specific user data first
      const sessionUserData = sessionStorage.getItem(`${sessionKey}_user`);
      
      if (token && username) {
        if (sessionUserData) {
          // Use cached session data
          try {
            const userData = JSON.parse(sessionUserData);
            console.log('AuthContext: Using cached session user data:', userData);
            
            // Check if cached data has profile picture, if not, fetch fresh data
            if (!userData.profile_picture && !userData.profile?.profile_picture) {
              console.log('AuthContext: Cached data missing profile picture, fetching fresh data...');
              // Fetch fresh user profile to get profile picture
              fetchUserProfile().then((freshUserData) => {
                if (freshUserData) {
                  setIsAuthenticated(true);
                }
                setLoading(false);
              });
              return;
            }
            
            setUser(userData);
            setIsAuthenticated(true);
            setIsAdmin(userData.isAdmin || false);
            setLoading(false);
            return;
          } catch (error) {
            console.error('AuthContext: Error parsing session user data:', error);
          }
        }
        
        console.log('AuthContext: No cached session data, fetching user profile...');
        // Fetch user profile to check admin status with retry
        const fetchWithRetry = async (retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              const userData = await fetchUserProfile();
              if (userData) {
                setIsAuthenticated(true);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.log(`AuthContext: Profile fetch attempt ${i + 1} failed:`, error);
              if (i < retries - 1) {
                console.log(`AuthContext: Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
              }
            }
          }
          // If all retries failed, set loading to false
          setLoading(false);
        };
        
        fetchWithRetry();
      } else {
        console.log('AuthContext: No token or username found, clearing user data');
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setLoading(false);
        
        // Clear session-specific data
        sessionStorage.removeItem(`${sessionKey}_user`);
        sessionStorage.removeItem(`${sessionKey}_access_token`);
        sessionStorage.removeItem(`${sessionKey}_username`);
      }
    };

    // Check authentication status on mount
    checkAuthStatus();

    // Listen for storage changes (when localStorage is modified in other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'access_token' || e.key === 'username' || e.key === 'auth_changed') {
        console.log('Auth state changed in another tab, updating...', e.key, e.newValue);
        
        // Get the current user from this tab's session
        const currentSessionUser = sessionStorage.getItem(`${sessionKey}_user`);
        const currentUser = currentSessionUser ? JSON.parse(currentSessionUser)?.username : null;
        
        // Get the new user from localStorage
        const newUsername = localStorage.getItem('username');
        
        // Only synchronize if:
        // 1. Both users are the same (same user logging in/out in different tabs)
        // 2. Current tab has no user and new user is logging in
        // 3. Current tab has a user and new user is null (logout)
        
        if (currentUser && newUsername && currentUser !== newUsername) {
          console.log('Different user logged in, maintaining separate session');
          // Different user logged in, don't synchronize - maintain separate session
          return;
        }
        
        if (currentUser && !newUsername) {
          console.log('User logged out in another tab, synchronizing logout');
          // Same user logged out in another tab, synchronize logout
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          sessionStorage.removeItem(`${sessionKey}_user`);
          return;
        }
        
        if (!currentUser && newUsername) {
          console.log('User logged in in another tab, synchronizing login');
          // User logged in in another tab, synchronize login
          setTimeout(() => {
            checkAuthStatus();
          }, 100);
          return;
        }
        
        // Same user, synchronize normally
        setTimeout(() => {
          checkAuthStatus();
        }, 100);
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Add custom event listener for auth changes
    const handleAuthChange = () => {
      console.log('Custom auth change event received');
      checkAuthStatus();
    };
    window.addEventListener('authChanged', handleAuthChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChanged', handleAuthChange);
    };
  }, []);

  const login = async (userData) => {
    console.log('AuthContext: Login called with userData:', userData);
    
    // Support both flattened and nested userData
    const providedUser = userData.userData && userData.userData.userData ? userData.userData.userData
                         : userData.userData ? userData.userData
                         : userData.user ? userData.user
                         : null;
    
    console.log('AuthContext: Extracted providedUser:', providedUser);
    
    // If user data is provided from login response, use it immediately
    if (providedUser) {
      const userInfo = {
        ...providedUser,
        isAdmin: providedUser.is_admin === true,
        tabId: tabId,
        sessionKey: sessionKey
      };
      setUser(userInfo);
      setIsAuthenticated(true);
      
      // Ensure admin status is properly detected
      const adminStatus = providedUser.is_admin === true;
      setIsAdmin(adminStatus);
      
      // Store user data in session-specific storage
      sessionStorage.setItem(`${sessionKey}_user`, JSON.stringify(userInfo));
      
      console.log('AuthContext: User logged in with admin status:', adminStatus);
      console.log('AuthContext: isAdmin set to:', adminStatus);
      console.log('AuthContext: User data:', userInfo);
      console.log('AuthContext: Raw is_admin value:', providedUser.is_admin);
      console.log('AuthContext: Profile picture URL:', userInfo.profile_picture);
    } else {
      console.log('AuthContext: No user data provided, fetching profile...');
      // Fetch user profile after login to get admin status
      const profileData = await fetchUserProfile();
      if (profileData) {
        setIsAuthenticated(true);
      }
    }
    
    // Store authentication tokens in sessionStorage for this tab
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');
    if (token) {
      sessionStorage.setItem(`${sessionKey}_access_token`, token);
    }
    if (username) {
      sessionStorage.setItem(`${sessionKey}_username`, username);
    }
    
    // Store user-specific auth data in sessionStorage to prevent cross-user sync
    sessionStorage.setItem(`${sessionKey}_auth_user`, userData.username);
    
    // Trigger storage event for other tabs by actually modifying localStorage
    localStorage.setItem('access_token', token); // This triggers the storage event
    
    // Also trigger custom event for immediate response
    window.dispatchEvent(new CustomEvent('authChanged'));
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    
    // Clear session-specific data
    sessionStorage.removeItem(`${sessionKey}_user`);
    sessionStorage.removeItem(`${sessionKey}_auth_user`);
    sessionStorage.removeItem(`${sessionKey}_access_token`);
    sessionStorage.removeItem(`${sessionKey}_username`);
    
    // Trigger storage event for other tabs by setting a dummy value and removing it
    localStorage.setItem('auth_changed', Date.now().toString());
    localStorage.removeItem('auth_changed');
    
    // Also trigger custom event for immediate response
    window.dispatchEvent(new CustomEvent('authChanged'));
  };

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    loading,
    login,
    logout,
    fetchUserProfile,
    tabId,
    sessionKey,
    isPrimaryTab: tabManager.isPrimaryTab(),
    refreshAuth: () => {
      const token = sessionStorage.getItem(`${sessionKey}_access_token`) || localStorage.getItem('access_token');
      const username = sessionStorage.getItem(`${sessionKey}_username`) || localStorage.getItem('username');
      
      if (token && username) {
        fetchUserProfile().then((userData) => {
          if (userData) {
            setIsAuthenticated(true);
          }
        });
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        // Clear session-specific data
        sessionStorage.removeItem(`${sessionKey}_user`);
        sessionStorage.removeItem(`${sessionKey}_auth_user`);
        sessionStorage.removeItem(`${sessionKey}_access_token`);
        sessionStorage.removeItem(`${sessionKey}_username`);
      }
    },
    updateUserData: (newUserData) => {
      console.log('Updating user data in AuthContext:', newUserData);
      // Update user data when profile is updated (e.g., after profile picture upload)
      const updatedUser = { ...user, ...newUserData };
      setUser(updatedUser);
      
      // Update session storage
      sessionStorage.setItem(`${sessionKey}_user`, JSON.stringify(updatedUser));
      
      // Trigger custom event for immediate UI updates
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { updatedUser, changes: newUserData }
      }));
      
      console.log('User data updated successfully:', updatedUser);
    }
  };

  // Expose refreshAuth globally for debugging
  if (typeof window !== 'undefined') {
    window.refreshAuth = value.refreshAuth;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 