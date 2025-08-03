const API_BASE_URL = 'http://localhost:8000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API utility functions
export const api = {
  // Registration
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/user/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  // Login
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return response.json();
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

  // Get user profile
  getUserProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/user/profile/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Get all users
  getUsers: async () => {
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

  // Admin API functions
  admin: {
    // Get all users (admin only)
    getUsers: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get all messages (admin only)
    getMessages: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/messages/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.json();
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
      const response = await fetch(`${API_BASE_URL}/admin/colleges/add/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(collegeData),
      });
      return response.json();
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
  },
}; 