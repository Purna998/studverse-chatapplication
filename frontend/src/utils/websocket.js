class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Set();
    this.tokenRefreshInProgress = false;
    this.messageQueue = [];
    this.processingQueue = false;
    this.connectionPool = new Map();
    this.lastPingTime = 0;
    this.pingInterval = null;
    this.heartbeatInterval = 30000; // 30 seconds
    this.recentMessages = new Set(); // Track recent messages to prevent duplicates
    this.maxRecentMessages = 100; // Keep last 100 messages in memory
  }

  async getValidToken() {
    // Check if token exists and is not expired
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      return null;
    }

    // Try to refresh token if needed
    try {
      const response = await fetch('http://localhost:8000/api/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: localStorage.getItem('refresh_token')
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        return data.access;
      } else {
        console.error('Token refresh failed');
        return null;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return token; // Return original token as fallback
    }
  }

  async connect(token = null) {
    if (this.socket && this.isConnected) {
      return;
    }

    try {
      // Get valid token if not provided
      const validToken = token || await this.getValidToken();
      if (!validToken) {
        console.error('No valid token available for WebSocket connection');
        return;
      }

      // Create WebSocket with optimized settings
      this.socket = new WebSocket(`ws://localhost:8000/ws/chat/?token=${validToken}`);
      
      // Set binary type for faster data transfer
      this.socket.binaryType = 'arraybuffer';
      
      this.socket.onopen = () => {
        console.log('WebSocket connected - Ultra Fast Mode');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.processMessageQueue();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = async (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        // If connection was closed due to authentication issues, try to refresh token
        if (event.code === 4001 || event.reason?.includes('Token')) {
          console.log('Token expired, attempting to refresh...');
          await this.attemptReconnectWithTokenRefresh();
        } else {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // ULTRA FAST MESSAGE SENDING
  sendMessage(message, sender, receiver) {
    if (this.socket && this.isConnected) {
      const messageId = `${sender}_${receiver}_${Date.now()}`;
      const data = {
        message: message,
        sender: sender,
        receiver: receiver,
        timestamp: Date.now(),
        message_id: messageId
      };
      
      // Send immediately for instant delivery
      this.socket.send(JSON.stringify(data));
      
      // Also queue for reliability
      this.messageQueue.push(data);
      
      return true;
    } else {
      console.error('WebSocket not connected');
      // Queue message for later sending
      this.messageQueue.push({
        message: message,
        sender: sender,
        receiver: receiver,
        timestamp: Date.now()
      });
      return false;
    }
  }

  // Process queued messages
  async processMessageQueue() {
    if (this.processingQueue || !this.isConnected) return;
    
    this.processingQueue = true;
    
    while (this.messageQueue.length > 0 && this.isConnected) {
      const messageData = this.messageQueue.shift();
      try {
        this.socket.send(JSON.stringify(messageData));
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error('Error sending queued message:', error);
        // Put message back in queue
        this.messageQueue.unshift(messageData);
        break;
      }
    }
    
    this.processingQueue = false;
  }

  // Heartbeat to keep connection alive
  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        this.lastPingTime = Date.now();
      }
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  handleMessage(data) {
    // Handle ping/pong for connection health
    if (data.type === 'pong') {
      const latency = Date.now() - data.timestamp;
      console.log(`WebSocket latency: ${latency}ms`);
      return;
    }

    // Handle message sent confirmation
    if (data.type === 'message_sent') {
      console.log('Message sent confirmation received in WebSocket manager:', data);
      // Don't check for duplicates for message_sent type as it's a confirmation
    } else {
      // Check for duplicate messages (only for regular messages, not confirmations)
      const messageId = data.message_id || `${data.sender}_${data.receiver}_${data.timestamp}`;
      if (this.recentMessages.has(messageId)) {
        console.log('Duplicate message detected in frontend, ignoring:', messageId);
        return;
      }

      // Add to recent messages
      this.recentMessages.add(messageId);
      if (this.recentMessages.size > this.maxRecentMessages) {
        // Remove oldest messages
        const messagesArray = Array.from(this.recentMessages);
        this.recentMessages = new Set(messagesArray.slice(-this.maxRecentMessages));
      }
    }

    // Log all message types for debugging
    console.log('WebSocket message received:', {
      type: data.type,
      sender: data.sender,
      receiver: data.receiver,
      message: data.message?.substring(0, 50) + (data.message?.length > 50 ? '...' : ''),
      message_id: data.message_id,
      timestamp: data.timestamp,
      fullData: data
    });

    // Notify all registered handlers with minimal processing
    this.messageHandlers.forEach(handler => {
      try {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
          handler(data);
        });
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
          this.connect(token);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  async attemptReconnectWithTokenRefresh() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect with token refresh (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        await this.connect(); // This will refresh the token
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  isConnected() {
    return this.isConnected;
  }

  // Get connection status and latency
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      latency: this.lastPingTime ? Date.now() - this.lastPingTime : null,
      queuedMessages: this.messageQueue.length
    };
  }
}

// Create singleton instance
const websocketManager = new WebSocketManager();

export default websocketManager; 