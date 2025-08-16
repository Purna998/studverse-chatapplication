import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import tabManager from '../../utils/tabManager';

const TabSessionIndicator = () => {
  const { tabId, sessionKey, isPrimaryTab } = useAuth();
  const [activeTabs, setActiveTabs] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateActiveTabs = () => {
      const tabs = tabManager.getActiveTabs();
      setActiveTabs(tabs);
    };

    // Update active tabs every 30 seconds
    const interval = setInterval(updateActiveTabs, 30000);
    updateActiveTabs(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!tabId) return null;

  return (
    <div className="relative">
      {/* Tab indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors duration-200 ${
          isPrimaryTab 
            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
        title={`Tab ID: ${tabId}`}
      >
        <div className={`w-2 h-2 rounded-full ${
          isPrimaryTab ? 'bg-green-500' : 'bg-blue-500'
        }`}></div>
        <span>{isPrimaryTab ? 'Online' : 'Tab'}</span>
        {activeTabs.length > 1 && (
          <span className="ml-1 bg-white bg-opacity-50 rounded-full px-1 text-xs">
            {activeTabs.length}
          </span>
        )}
      </button>

      {/* Tab details dropdown */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Active Tabs</h3>
            <p className="text-xs text-gray-500 mt-1">
              {activeTabs.length} tab{activeTabs.length !== 1 ? 's' : ''} active
            </p>
          </div>
          
          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {activeTabs.map((tab, index) => (
              <div
                key={tab.tabId}
                className={`flex items-center justify-between p-2 rounded ${
                  tab.tabId === tabId 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {index === 0 ? 'Online' : `Tab ${index + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tab.tabId.slice(-8)}...
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(tab.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600">
              <p>Current Tab: {tabId.slice(-8)}...</p>
              <p>Session: {sessionKey.slice(-8)}...</p>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

export default TabSessionIndicator; 