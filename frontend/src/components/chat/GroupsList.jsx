import React, { useState, useEffect, useMemo } from 'react';
import { groupAPI } from '../../utils/api';

// Trie Node class for efficient string searching
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.groupIds = new Set();
  }
}

// Trie class for group search
class GroupTrie {
  constructor() {
    this.root = new TrieNode();
  }

  // Insert a word (search term) with associated group ID
  insert(word, groupId) {
    let node = this.root;
    const lowerWord = word.toLowerCase();
    
    for (let char of lowerWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
      node.groupIds.add(groupId);
    }
    node.isEndOfWord = true;
  }

  // Search for groups that match the prefix
  search(prefix) {
    let node = this.root;
    const lowerPrefix = prefix.toLowerCase();
    
    // Navigate to the node representing the prefix
    for (let char of lowerPrefix) {
      if (!node.children.has(char)) {
        return new Set(); // No matches found
      }
      node = node.children.get(char);
    }
    
    return node.groupIds;
  }

  // Build trie from groups
  buildFromGroups(groups) {
    // Clear existing trie
    this.root = new TrieNode();
    
    groups.forEach(group => {
      // Insert searchable terms for each group
      const searchTerms = [
        group.name || '',
        group.description || '',
        group.created_by?.username || '',
        group.created_by?.full_name || ''
      ].filter(term => term.trim() !== '');
      
      searchTerms.forEach(term => {
        this.insert(term, group.id);
      });
    });
  }
}

const GroupsList = ({ onGroupSelect, selectedGroupId }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupSearch, setGroupSearch] = useState(""); // New state for group search

  // Create trie instance
  const groupTrie = useMemo(() => new GroupTrie(), []);

  // Build trie when groups change
  useEffect(() => {
    if (groups.length > 0) {
      groupTrie.buildFromGroups(groups);
    }
  }, [groups, groupTrie]);

  // Filter groups based on search term
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) {
      return groups;
    }
    
    const matchingIds = groupTrie.search(groupSearch);
    return groups.filter(group => matchingIds.has(group.id));
  }, [groups, groupSearch, groupTrie]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== GROUPS LIST DEBUG ===');
      console.log('Loading groups...');
      
      const response = await groupAPI.getUserGroups();
      console.log('Groups response:', response);
      
      if (response.success) {
        console.log('Groups loaded successfully:', response.data);
        console.log('Debug info:', response.debug_info);
        setGroups(response.data);
      } else {
        console.error('Failed to load groups:', response.error);
        setError(response.error || 'Failed to load groups');
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setError(error.message || 'Failed to load groups');
    } finally {
      setLoading(false);
      console.log('=== END GROUPS LIST DEBUG ===');
    }
  };

  const handleGroupClick = (group) => {
    onGroupSelect(group);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="w-16 h-16 bg-red-100/80 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <button
          onClick={loadGroups}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:bg-indigo-100 px-3 py-1 rounded transition-all duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Group Search */}
      <div className="p-4 border-b border-gray-200/50 bg-white/30">
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search groups..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {groupSearch && (
              <button 
                onClick={() => setGroupSearch("")}
                className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Search results info */}
          {groupSearch && (
            <div className="text-xs text-gray-500">
              {filteredGroups.length === groups.length 
                ? `Showing all ${groups.length} groups`
                : `Found ${filteredGroups.length} of ${groups.length} groups`
              }
            </div>
          )}
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-16 h-16 bg-gray-100/80 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {groupSearch ? 'No groups match your search' : 'No groups yet'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {groupSearch ? 'Try different keywords' : 'Create a group to get started'}
            </p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div
              key={group.id}
              onClick={() => handleGroupClick(group)}
              className={`flex items-center p-4 hover:bg-white/60 cursor-pointer transition-all duration-200 ${
                selectedGroupId === group.id ? 'bg-indigo-50/80 border-r-2 border-indigo-500 shadow-sm' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                {group.image ? (
                  <img
                    src={group.image}
                    alt={group.name}
                    className="w-12 h-12 rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Group Info */}
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {group.name}
                  </h3>
                  {group.is_admin && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 shadow-sm">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Activity Indicator */}
              <div className="ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupsList; 