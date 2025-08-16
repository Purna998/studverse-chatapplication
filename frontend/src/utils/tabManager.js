// Tab ID Management System
class TabManager {
  constructor() {
    this.tabId = this.generateTabId();
    this.sessionKey = `session_${this.tabId}`;
    this.init();
  }

  // Generate a unique tab ID
  generateTabId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }

  // Initialize tab manager
  init() {
    // Store tab ID in sessionStorage (tab-specific)
    sessionStorage.setItem('tabId', this.tabId);
    
    // Listen for storage changes to sync with other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Notify other tabs about this tab's existence
    this.broadcastTabPresence();
    
    // Set up heartbeat to keep tab alive
    this.startHeartbeat();
  }

  // Handle storage changes from other tabs
  handleStorageChange(event) {
    if (event.key === 'tabPresence') {
      try {
        const data = JSON.parse(event.newValue);
        if (data.tabId !== this.tabId) {
          console.log(`Tab ${data.tabId} is active`);
        }
      } catch (error) {
        console.error('Error parsing tab presence data:', error);
      }
    }
  }

  // Broadcast this tab's presence to other tabs
  broadcastTabPresence() {
    const presenceData = {
      tabId: this.tabId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
    
    localStorage.setItem('tabPresence', JSON.stringify(presenceData));
  }

  // Start heartbeat to keep tab presence active
  startHeartbeat() {
    setInterval(() => {
      this.broadcastTabPresence();
    }, 30000); // Every 30 seconds
  }

  // Get current tab ID
  getTabId() {
    return this.tabId;
  }

  // Get session key for this tab
  getSessionKey() {
    return this.sessionKey;
  }

  // Check if this is the primary tab (first tab opened)
  isPrimaryTab() {
    const tabs = this.getActiveTabs();
    if (tabs.length === 0) return true;
    
    // Sort by timestamp and check if this tab is the oldest
    const sortedTabs = tabs.sort((a, b) => a.timestamp - b.timestamp);
    return sortedTabs[0].tabId === this.tabId;
  }

  // Get all active tabs
  getActiveTabs() {
    const tabs = [];
    const now = Date.now();
    
    // Check localStorage for tab presence data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tabPresence_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          // Only include tabs that have been active in the last 2 minutes
          if (now - data.timestamp < 120000) {
            tabs.push(data);
          } else {
            // Clean up stale tab data
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.error('Error parsing tab data:', error);
        }
      }
    }
    
    return tabs;
  }

  // Clean up when tab is closing
  cleanup() {
    // Remove this tab's presence data
    localStorage.removeItem(`tabPresence_${this.tabId}`);
    
    // Clear session-specific data
    sessionStorage.removeItem('tabId');
  }
}

// Create singleton instance
const tabManager = new TabManager();

// Handle page unload to cleanup
window.addEventListener('beforeunload', () => {
  tabManager.cleanup();
});

export default tabManager; 