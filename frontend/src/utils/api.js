import tabManager from './tabManager';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const sessionKey = tabManager.getSessionKey();
  // Use session-specific token first, fallback to localStorage
  const sessionToken = sessionStorage.getItem(`${sessionKey}_access_token`);
  const localToken = localStorage.getItem('access_token');
  const token = sessionToken || localToken;
  
  console.log('API Headers Debug:', {
    sessionKey,
    sessionToken: sessionToken ? `${sessionToken.substring(0, 20)}...` : 'null',
    localStorageToken: localToken ? `${localToken.substring(0, 20)}...` : 'null',
    finalToken: token ? `${token.substring(0, 20)}...` : 'null',
    tabId: tabManager.getTabId(),
    sessionStorageKeys: Object.keys(sessionStorage).filter(key => key.includes('access_token')),
    localStorageKeys: Object.keys(localStorage).filter(key => key.includes('access_token'))
  });
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    'X-Tab-ID': tabManager.getTabId(),
    'X-Session-Key': tabManager.getSessionKey(),
    'X-User-Agent': navigator.userAgent
  };
};

// Google OAuth utility
const googleOAuth = {
  // Initialize Google OAuth
  init: () => {
    return new Promise((resolve, reject) => {
      // Load Google OAuth script
      if (window.google) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google OAuth script'));
      document.head.appendChild(script);
    });
  },

  // Sign in with Google
  signIn: async () => {
    try {
      await googleOAuth.init();
      
      return new Promise((resolve, reject) => {
        google.accounts.id.initialize({
          client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual client ID
          callback: async (response) => {
            try {
              // Send the ID token to our backend
              const result = await api.googleAuth(response.credential);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
        });

        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google Sign-In was not displayed'));
          }
        });
      });
    } catch (error) {
      throw error;
    }
  },

  // Sign out
  signOut: () => {
    if (window.google && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
  }
};

// API utility functions
const api = {
  // Google OAuth Authentication
  googleAuth: async (idToken) => {
    const response = await fetch(`${API_BASE_URL}/auth/google/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token: idToken }),
    });
    return response.json();
  },

  // Registration
  register: async (userData) => {
    try {
      console.log('API: Registering user with data:', userData);
      const response = await fetch(`${API_BASE_URL}/user/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      console.log('API: Registration response status:', response.status);
      const data = await response.json();
      console.log('API: Registration response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('API: Registration error:', error);
      throw error;
    }
  },

  // Login
  login: async (credentials) => {
    try {
      console.log('API: Logging in with credentials:', credentials);
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      console.log('API: Login response status:', response.status);
      const data = await response.json();
      console.log('API: Login response data:', data);
      
      if (!response.ok) {
        throw new Error(data.detail || data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('API: Login error:', error);
      throw error;
    }
  },

  // Get colleges for dropdown
  getColleges: async () => {
    const response = await fetch(`${API_BASE_URL}/colleges/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  // Public forums
  getForums: async () => {
    const response = await fetch(`${API_BASE_URL}/forums/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  // Create forum (community)
  createForum: async (title, description = '', image = null, memberIds = []) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description || '');
    if (image) {
      formData.append('image', image);
    }
    if (Array.isArray(memberIds)) {
      memberIds.forEach(id => formData.append('members', id));
    }

    const authHeaders = getAuthHeaders();
    const { 'Content-Type': _omit, ...headers } = authHeaders;

    const response = await fetch(`${API_BASE_URL}/forums/create/`, {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData,
    });
    return response.json();
  },

  // List channels of a forum
  listForumChannels: async (forumId) => {
    const response = await fetch(`${API_BASE_URL}/forums/${forumId}/channels/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  // Create channel in a forum
  createForumChannel: async (forumId, name) => {
    const response = await fetch(`${API_BASE_URL}/forums/${forumId}/channels/create/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return response.json();
  },

  // Channel messages
  getChannelMessages: async (channelId) => {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  sendChannelMessage: async (channelId, content) => {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    return response.json();
  },

  // Generate invitation link for a forum
  generateForumInvitation: async (forumId) => {
    const response = await fetch(`${API_BASE_URL}/forums/${forumId}/invitation/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Join forum via invitation link
  joinForumViaInvitation: async (forumId) => {
    const response = await fetch(`${API_BASE_URL}/forums/${forumId}/join/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Get user profile
  getUserProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/user/profile/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/user/profile/`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return response.json();
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    console.log('API: Uploading profile picture to:', `${API_BASE_URL}/user/profile/upload-picture/`);
    console.log('API: File details:', { name: file.name, size: file.size, type: file.type });
    console.log('API: Auth headers:', getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/user/profile/upload-picture/`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeaders().Authorization,
        'X-Tab-ID': getAuthHeaders()['X-Tab-ID'],
        'X-Session-Key': getAuthHeaders()['X-Session-Key'],
        'X-User-Agent': getAuthHeaders()['X-User-Agent'],
      },
      body: formData,
    });
    
    console.log('API: Response status:', response.status);
    const data = await response.json();
    console.log('API: Response data:', data);
    return data;
  },

  // Get all users
  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // List users (alias for getUsers)
  listUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Send message
  sendMessage: async (messageData) => {
    const response = await fetch(`${API_BASE_URL}/send_message/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData),
    });
    return response.json();
  },

  // Get conversation
  getConversation: async (sender, receiver) => {
    const response = await fetch(`${API_BASE_URL}/get_conversation/${sender}/${receiver}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Check token validity
  checkToken: async () => {
    const response = await fetch(`${API_BASE_URL}/token/checktoken/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Debug function to test authentication
  debugAuth: async () => {
    const response = await fetch(`${API_BASE_URL}/debug-auth/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Test authentication endpoint
  testAuth: async () => {
    const response = await fetch(`${API_BASE_URL}/test-auth/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // New dynamic chat system API functions
  chat: {
    // Get user conversations
    getConversations: async () => {
      const response = await fetch(`${API_BASE_URL}/conversations/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Search user by email
    searchUserByEmail: async (email) => {
      const response = await fetch(`${API_BASE_URL}/search_user_by_email/?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get conversation messages
    getConversationMessages: async (conversationId) => {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Send new message (creates conversation if needed)
    sendMessageNew: async (receiverEmail, content, attachment = null) => {
      // For now, only support text messages without attachments
      // TODO: Add attachment support later
      if (attachment) {
        console.warn('Attachments not supported yet, sending text only');
      }

      const messageData = {
        receiver_email: receiverEmail,
        content: content
      };

      console.log('API: Sending message:', {
        receiverEmail,
        hasContent: !!content,
        hasAttachment: !!attachment,
        messageData
      });

      const response = await fetch(`${API_BASE_URL}/send_message_new/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(messageData),
      });
      
      console.log('API: Response status:', response.status);
      const data = await response.json();
      console.log('API: Response data:', data);
      return data;
    },



    // Mark conversation as read
    markConversationRead: async (conversationId) => {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/mark_read/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get conversation resources
    getConversationResources: async (conversationId) => {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/resources/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get user file statistics
    getUserFileStats: async () => {
      const response = await fetch(`${API_BASE_URL}/user/file-stats/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Download message attachment
    downloadAttachment: async (messageId) => {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/download/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }
      
      return response;
    },

    // Delete message
    deleteMessage: async (messageId) => {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/delete/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      
      return response.json();
    },
  },

  // Admin API functions
  admin: {
    // Get all users (admin only)
    getUsers: async () => {
      try {
        console.log('API: Getting admin users...');
        const response = await fetch(`${API_BASE_URL}/admin/users/`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        
        console.log('API: Admin users response status:', response.status);
        const data = await response.json();
        console.log('API: Admin users response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error('API: Admin users error:', error);
        throw error;
      }
    },

    // Delete specific user (admin only)
    deleteUser: async (userId) => {
      try {
        console.log('API: Deleting user:', userId);
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/delete/`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        console.log('API: Delete user response status:', response.status);
        const data = await response.json();
        console.log('API: Delete user response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error('API: Delete user error:', error);
        throw error;
      }
    },

    // Delete specific group (admin only)
    deleteGroup: async (groupId) => {
      try {
        console.log('API: Deleting group:', groupId);
        const response = await fetch(`${API_BASE_URL}/admin/groups/${groupId}/delete/`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        console.log('API: Delete group response status:', response.status);
        const data = await response.json();
        console.log('API: Delete group response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error('API: Delete group error:', error);
        throw error;
      }
    },

    // Delete specific forum (admin only)
    deleteForum: async (forumId) => {
      try {
        console.log('API: Deleting forum:', forumId);
        const response = await fetch(`${API_BASE_URL}/admin/forums/${forumId}/delete/`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        console.log('API: Delete forum response status:', response.status);
        const data = await response.json();
        console.log('API: Delete forum response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error('API: Delete forum error:', error);
        throw error;
      }
    },

    // Delete specific college (admin only)
    deleteCollege: async (collegeId) => {
      try {
        console.log('API: Deleting college:', collegeId);
        const response = await fetch(`${API_BASE_URL}/admin/colleges/${collegeId}/delete/`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        console.log('API: Delete college response status:', response.status);
        const data = await response.json();
        console.log('API: Delete college response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error('API: Delete college error:', error);
        throw error;
      }
    },

    // Get all messages (admin only)
    getMessages: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/messages/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Delete all messages and conversations (admin only)
    deleteAllMessages: async () => {
      try {
        console.log('API: Deleting all messages and conversations...');
        const response = await fetch(`${API_BASE_URL}/admin/messages/delete-all/`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        console.log('API: Delete messages response status:', response.status);
        const data = await response.json();
        console.log('API: Delete messages response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error('API: Delete messages error:', error);
        throw error;
      }
    },

    // Get all groups (admin only)
    getGroups: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/groups/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get all forums (admin only)
    getForums: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/forums/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Add new college (admin only)
    addCollege: async (collegeData) => {
      console.log('DEBUG: addCollege called with data:', collegeData);
      console.log('DEBUG: Auth headers:', getAuthHeaders());
      
      const response = await fetch(`${API_BASE_URL}/admin/colleges/add/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(collegeData),
      });
      
      console.log('DEBUG: Response status:', response.status);
      console.log('DEBUG: Response headers:', response.headers);
      
      const data = await response.json();
      console.log('DEBUG: Response data:', data);
      
      return data;
    },

    // Add new group (admin only)
    addGroup: async (groupData) => {
      const response = await fetch(`${API_BASE_URL}/admin/groups/add/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(groupData),
      });
      return response.json();
    },

    // Add new forum (admin only)
    addForum: async (forumData) => {
      const response = await fetch(`${API_BASE_URL}/admin/forums/add/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(forumData),
      });
      return response.json();
    },

    // Delete college (admin only)
    deleteCollege: async (collegeId) => {
      console.log('DEBUG: deleteCollege called with ID:', collegeId);
      const response = await fetch(`${API_BASE_URL}/admin/colleges/${collegeId}/delete/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      console.log('DEBUG: Response status:', response.status);
      const data = await response.json();
      console.log('DEBUG: Response data:', data);
      return data;
    },

    // Delete group (admin only)
    deleteGroup: async (groupId) => {
      console.log('DEBUG: deleteGroup called with ID:', groupId);
      const response = await fetch(`${API_BASE_URL}/admin/groups/${groupId}/delete/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      console.log('DEBUG: Response status:', response.status);
      const data = await response.json();
      console.log('DEBUG: Response data:', data);
      return data;
    },

    // Delete forum (admin only)
    deleteForum: async (forumId) => {
      console.log('DEBUG: deleteForum called with ID:', forumId);
      const response = await fetch(`${API_BASE_URL}/admin/forums/${forumId}/delete/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      console.log('DEBUG: Response status:', response.status);
      const data = await response.json();
      console.log('DEBUG: Response data:', data);
      return data;
    },

    // Nearby users
    nearby: {
      getNearbyUsers: async () => {
        const response = await fetch(`${API_BASE_URL}/nearby/users/`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        return response.json();
      },

      updateLocation: async (latitude, longitude) => {
        const response = await fetch(`${API_BASE_URL}/user/location/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ latitude, longitude }),
        });
        return response.json();
      },
    },
  },
};

// Group Management API
const groupAPI = {
  // Create a new group
  createGroup: async (groupData) => {
    console.log('=== CREATE GROUP API DEBUG ===');
    console.log('Creating group with data:', groupData);
    
    const formData = new FormData();
    formData.append('name', groupData.name);
    formData.append('description', groupData.description || '');
    
    if (groupData.image) {
      formData.append('image', groupData.image);
    }
    
    if (groupData.members && groupData.members.length > 0) {
      groupData.members.forEach(memberId => {
        formData.append('members', memberId);
      });
    }

    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const headers = {
      'Authorization': getAuthHeaders().Authorization,
      'X-Tab-ID': getAuthHeaders()['X-Tab-ID'],
      'X-Session-Key': getAuthHeaders()['X-Session-Key'],
      'X-User-Agent': getAuthHeaders()['X-User-Agent'],
    };

    console.log('Request headers:', headers);

    try {
      const response = await fetch(`${API_BASE_URL}/groups/create/`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        console.error('Group creation failed:', responseData);
        throw new Error(responseData.error || 'Failed to create group');
      }
      
      console.log('=== END CREATE GROUP API DEBUG ===');
      return responseData;
    } catch (error) {
      console.error('Error in createGroup API call:', error);
      throw error;
    }
  },

  // Get user's groups
  getUserGroups: async () => {
    console.log('=== GET USER GROUPS API DEBUG ===');
    
    const headers = getAuthHeaders();
    console.log('Request headers:', headers);

    try {
      const response = await fetch(`${API_BASE_URL}/groups/`, {
        method: 'GET',
        headers: headers,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        console.error('Get user groups failed:', responseData);
        throw new Error(responseData.error || 'Failed to get user groups');
      }
      
      console.log('=== END GET USER GROUPS API DEBUG ===');
      return responseData;
    } catch (error) {
      console.error('Error in getUserGroups API call:', error);
      throw error;
    }
  },

  // Get group details
  getGroupDetails: async (groupId) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // Get group members
  getGroupMembers: async (groupId) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // Add member to group
  addGroupMember: async (groupId, userId) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/add/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });

    return response.json();
  },

  // Remove member from group
  removeGroupMember: async (groupId, userId) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}/remove/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // Promote member to admin
  promoteGroupMember: async (groupId, userId) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}/promote/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // Get group messages
  getGroupMessages: async (groupId, page = 1, pageSize = 50) => {
    console.log('=== GET GROUP MESSAGES API DEBUG ===');
    console.log('Group ID:', groupId, 'Page:', page, 'Page Size:', pageSize);
    
    const headers = getAuthHeaders();
    console.log('Request headers:', headers);

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/messages/?page=${page}&page_size=${pageSize}`, {
        method: 'GET',
        headers: headers,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        console.error('Get group messages failed:', responseData);
        throw new Error(responseData.error || 'Failed to get group messages');
      }
      
      console.log('=== END GET GROUP MESSAGES API DEBUG ===');
      return responseData;
    } catch (error) {
      console.error('Error in getGroupMessages API call:', error);
      throw error;
    }
  },

  // Send group message
  sendGroupMessage: async (groupId, message, attachment = null) => {
    console.log('=== SEND GROUP MESSAGE API DEBUG ===');
    console.log('Group ID:', groupId, 'Message:', message, 'Attachment:', attachment);
    
    const formData = new FormData();
    formData.append('message', message);
    
    if (attachment) {
      formData.append('attachment', attachment);
    }

    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const headers = {
      'Authorization': getAuthHeaders().Authorization,
      'X-Tab-ID': getAuthHeaders()['X-Tab-ID'],
      'X-Session-Key': getAuthHeaders()['X-Session-Key'],
      'X-User-Agent': getAuthHeaders()['X-User-Agent'],
    };

    console.log('Request headers:', headers);

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/messages/send/`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        console.error('Send group message failed:', responseData);
        throw new Error(responseData.error || 'Failed to send group message');
      }
      
      console.log('=== END SEND GROUP MESSAGE API DEBUG ===');
      return responseData;
    } catch (error) {
      console.error('Error in sendGroupMessage API call:', error);
      throw error;
    }
  },

  // Delete group
  deleteGroup: async (groupId) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/delete/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // Update group
  updateGroup: async (groupId, groupData) => {
    const formData = new FormData();
    formData.append('name', groupData.name);
    formData.append('description', groupData.description || '');
    
    if (groupData.image) {
      formData.append('image', groupData.image);
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/update/`, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeaders().Authorization,
        'X-Tab-ID': getAuthHeaders()['X-Tab-ID'],
        'X-Session-Key': getAuthHeaders()['X-Session-Key'],
        'X-User-Agent': getAuthHeaders()['X-User-Agent'],
      },
      body: formData,
    });

    return response.json();
  },
};

// Single export statement to avoid duplicate exports
export { api, groupAPI }; 