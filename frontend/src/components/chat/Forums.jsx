import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import CreateChannelModal from './CreateChannelModal';

const getIconFromTitle = (title) => {
  if (!title) return '💬';
  const firstChar = title.trim()[0];
  return /[A-Za-z0-9]/.test(firstChar) ? firstChar.toUpperCase() : '💬';
};

const Forums = () => {
  const [communities, setCommunities] = useState([]);
  const [activeCommunityId, setActiveCommunityId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForum, setShowCreateForum] = useState(false);
  const [newForumTitle, setNewForumTitle] = useState('');
  const [newForumDesc, setNewForumDesc] = useState('');
  const [newForumImage, setNewForumImage] = useState(null);
  const [newForumImagePreview, setNewForumImagePreview] = useState('');
  const [isCreatingForum, setIsCreatingForum] = useState(false);
  const [inviteOptions, setInviteOptions] = useState([]);
  const [selectedInvites, setSelectedInvites] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [composerText, setComposerText] = useState('');
  const [messages, setMessages] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [isGeneratingInvitation, setIsGeneratingInvitation] = useState(false);

  const sendChannelMessage = async () => {
    if (!activeChannelId || !composerText.trim()) return;
    const res = await api.sendChannelMessage(activeChannelId, composerText.trim());
    if (res?.data) {
      setMessages(prev => [...prev, res.data]);
      setComposerText('');
    }
  };

  const generateInvitation = async () => {
    if (!activeCommunityId) return;
    
    try {
      setIsGeneratingInvitation(true);
      const response = await api.generateForumInvitation(activeCommunityId);
      
      if (response.forum_id) {
        setInvitationData(response);
        setShowInvitationModal(true);
      } else {
        console.error('Failed to generate invitation:', response.error);
      }
    } catch (error) {
      console.error('Error generating invitation:', error);
    } finally {
      setIsGeneratingInvitation(false);
    }
  };

  const copyInvitationLink = () => {
    if (invitationData?.invitation_link) {
      const fullLink = `${window.location.origin}${invitationData.invitation_link}`;
      navigator.clipboard.writeText(fullLink);
      // You could add a toast notification here
      alert('Invitation link copied to clipboard!');
    }
  };

  useEffect(() => {
    const loadForums = async () => {
      try {
        setIsLoading(true);
        const res = await api.getForums();
        const forums = res?.data || [];
        const mapped = forums.map((f) => ({
          id: f.id,
          name: f.title,
          description: f.description,
          createdBy: f.created_by,
          createdAt: f.created_at,
          icon: getIconFromTitle(f.title),
          imageUrl: f.image_url || null,
        }));
        setCommunities(mapped);
        if (mapped.length > 0) {
          setActiveCommunityId(mapped[0].id);
          // channels will be loaded separately
        }
      } catch (e) {
        setError('Failed to load forums');
      } finally {
        setIsLoading(false);
      }
    };
    loadForums();
  }, []);

  // Handle invitation links
  useEffect(() => {
    const handleInvitationLink = async () => {
      const pendingInvitation = sessionStorage.getItem('pending_invitation');
      
      if (pendingInvitation) {
        try {
          const { forumId } = JSON.parse(pendingInvitation);
          
          const response = await api.joinForumViaInvitation(forumId);
          
          if (response.forum_id) {
            // Successfully joined the forum
            alert(`Successfully joined ${response.forum_name}!`);
            
            // Reload forums to include the newly joined one
            const res = await api.getForums();
            const forums = res?.data || [];
            const mapped = forums.map((f) => ({
              id: f.id,
              name: f.title,
              description: f.description,
              createdBy: f.created_by,
              createdAt: f.created_at,
              icon: getIconFromTitle(f.title),
              imageUrl: f.image_url || null,
            }));
            setCommunities(mapped);
            
            // Set the newly joined forum as active
            setActiveCommunityId(forumId);
            
            // Clean up sessionStorage
            sessionStorage.removeItem('pending_invitation');
          } else {
            alert(response.message || 'Failed to join forum');
            sessionStorage.removeItem('pending_invitation');
          }
        } catch (error) {
          console.error('Error joining forum:', error);
          alert('Failed to join forum. Please try again.');
          sessionStorage.removeItem('pending_invitation');
        }
      }
    };

    handleInvitationLink();
  }, []);

  // Load invite candidates once (all users)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.getUsers();
        const users = res?.data || [];
        setInviteOptions(users.map(u => ({ id: u.id, name: u.full_name || u.username, email: u.email })));
      } catch {}
    };
    loadUsers();
  }, []);

  // Load channels when active community changes
  useEffect(() => {
    const loadChannels = async () => {
      if (!activeCommunityId) return;
      const res = await api.listForumChannels(activeCommunityId);
      const channelList = (res?.data || []).map(ch => ({ id: ch.id, name: `#${ch.name}` }));
      setChannels(channelList);
      const general = channelList.find(c => c.name.toLowerCase() === '#general');
      setActiveChannelId(general?.id || channelList[0]?.id || null);
    };
    loadChannels();
  }, [activeCommunityId]);

  // Load messages of active channel
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChannelId) { setMessages([]); return; }
      const res = await api.getChannelMessages(activeChannelId);
      setMessages(res?.data || []);
    };
    loadMessages();
  }, [activeChannelId]);

  const activeCommunity = communities.find(c => c.id === activeCommunityId);
  const activeChannel = channels.find(ch => ch.id === activeChannelId);

  const handleCreateChannel = async (name, description) => {
    if (!activeCommunityId) return;
    try {
      const res = await api.createForumChannel(activeCommunityId, name);
      if (res?.data) {
        const ch = res.data;
        setChannels(prev => [...prev, { id: ch.id, name: `#${ch.name}` }]);
        setActiveChannelId(ch.id);
        return { success: true };
      } else {
        throw new Error(res?.error || 'Failed to create channel');
      }
    } catch (error) {
      throw new Error(error.message || 'Failed to create channel');
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Loading / Error states */}
      {isLoading && (
        <div className="w-full flex items-center justify-center">
          <div className="text-gray-600">Loading forums...</div>
        </div>
      )}
      {!isLoading && error && (
        <div className="w-full flex items-center justify-center">
          <div className="text-red-600">{error}</div>
        </div>
      )}
      {!isLoading && !error && (
      <>
      {/* Left-most Community Bar */}
      <aside className="w-16 border-r border-gray-200 flex flex-col items-center py-3 space-y-3">
        <button
          className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition"
          title="Create Community"
          onClick={() => setShowCreateForum(true)}
        >
          +
        </button>
        <div className="h-px w-10 bg-gray-200" />
        {communities.map(c => (
          <button
            key={c.id}
            onClick={async () => {
              setActiveCommunityId(c.id);
              // load channels and select #general automatically
              try {
                const chRes = await api.listForumChannels(c.id);
                const chList = (chRes?.data || []).map(ch => ({ id: ch.id, name: `#${ch.name}` }));
                setChannels(chList);
                const general = chList.find(ch => ch.name.toLowerCase() === '#general');
                setActiveChannelId(general?.id || chList[0]?.id || null);
              } catch {
                setChannels([]);
                setActiveChannelId(null);
              }
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition border border-transparent hover:border-gray-300 ${
              c.id === activeCommunityId ? 'bg-gray-100' : 'bg-white'
            }`}
            title={c.name}
          >
            {c.imageUrl ? (
              <img
                src={c.imageUrl}
                alt={c.name}
                className="w-10 h-10 rounded-xl object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span>{c.icon}</span>
            )}
          </button>
        ))}
      </aside>

      {/* Channels Sidebar */}
      <aside className="w-64 border-r border-gray-200 flex-shrink-0 hidden md:flex md:flex-col">
        {/* Community Header */}
        <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            
            <span className="text-base font-semibold text-gray-900">{activeCommunity?.name}</span>
            
          </div>
          <button 
            className="p-2 rounded hover:bg-gray-100" 
            title="Generate Invitation Link"
            onClick={generateInvitation}
            disabled={isGeneratingInvitation}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </button>
        </div>
        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-2 hover:bg-gray-100 ${
                ch.id === activeChannelId ? 'bg-gray-100 text-indigo-700' : 'text-gray-700'
              }`}
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h10"/></svg>
              <span>{ch.name}</span>
            </button>
          ))}
        </div>
        {/* Add Channel */}
        <div className="p-3 border-t border-gray-200">
          <button 
            className="w-full py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2" 
            onClick={() => setShowCreateChannel(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Channel</span>
          </button>
        </div>
      </aside>

      {/* Channel Content Area */}
      <section className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">{activeChannel?.name}</span>
            <span className="text-xs text-gray-500">in {activeCommunity?.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded hover:bg-gray-100" title="Search">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </button>
            <button className="md:hidden p-2 rounded hover:bg-gray-100" onClick={() => setShowSidebar(s => !s)} title="Toggle Sidebar">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>

        {/* Messages Area (placeholder) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(m => (
            <div key={m.id} className="flex items-start space-x-3">
              <img
                src={m.sender_profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"}
                alt={m.sender_username}
                className="w-8 h-8 rounded-full object-cover shadow-sm"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face";
                }}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900">{m.sender_username}</span>
                  <span className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-800">{m.content}</p>
              </div>
            </div>
          ))}
          {!activeCommunity && (
            <div className="text-sm text-gray-500">No forums available.</div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded hover:bg-gray-100" title="Upload">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12l1.5-1.5M20 12l-3 3m-6-9v6m0 0l-3-3m3 3l3-3"/></svg>
            </button>
            <input type="text" value={composerText} onChange={(e) => setComposerText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChannelMessage(); } }} placeholder={`Message ${channels.find(c=>c.id===activeChannelId)?.name || ''}`} className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" onClick={sendChannelMessage} disabled={!activeChannelId || !composerText.trim()}>Send</button>
          </div>
        </div>
      </section>
      {/* Create Community Modal */}
      {showCreateForum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!isCreatingForum) && setShowCreateForum(false)} />
          <div className="relative bg-white w-full max-w-md rounded-lg shadow-xl p-6 z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Community</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newForumTitle.trim()) return;
                try {
                  setIsCreatingForum(true);
                  const res = await api.createForum(newForumTitle.trim(), newForumDesc.trim(), newForumImage, selectedInvites);
                  if (res?.data) {
                    const forum = res.data;
                    const item = {
                      id: forum.id,
                      name: forum.title,
                      description: forum.description,
                      createdBy: forum.created_by,
                      createdAt: forum.created_at,
                      icon: getIconFromTitle(forum.title),
                      imageUrl: forum.image_url || null,
                    };
                    setCommunities(prev => [item, ...prev]);
                    setActiveCommunityId(item.id);
                    // Preload channels for this forum and select #general
                    try {
                      const chRes = await api.listForumChannels(item.id);
                      const chList = (chRes?.data || []).map(ch => ({ id: ch.id, name: `#${ch.name}` }));
                      setChannels(chList);
                      const general = chList.find(c => c.name.toLowerCase() === '#general');
                      setActiveChannelId(general?.id || chList[0]?.id || null);
                    } catch {}
                    setNewForumTitle('');
                    setNewForumDesc('');
                    setNewForumImage(null);
                    setNewForumImagePreview('');
                    setSelectedInvites([]);
                    setShowCreateForum(false);
                  } else {
                    alert(res?.error || 'Failed to create community');
                  }
                } finally {
                  setIsCreatingForum(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newForumTitle}
                  onChange={(e) => setNewForumTitle(e.target.value)}
                  placeholder="Enter community name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newForumDesc}
                  onChange={(e) => setNewForumDesc(e.target.value)}
                  placeholder="Describe the community"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setNewForumImage(file || null);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setNewForumImagePreview(ev.target?.result || '');
                      reader.readAsDataURL(file);
                    } else {
                      setNewForumImagePreview('');
                    }
                  }}
                  className="block w-full text-sm text-gray-700"
                />
                {newForumImagePreview && (
                  <div className="mt-2">
                    <img src={newForumImagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Friends (optional)</label>
                <div className="max-h-40 overflow-auto border border-gray-200 rounded-md divide-y">
                  {inviteOptions.map(opt => (
                    <label key={opt.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{opt.name}</div>
                        <div className="text-gray-500 text-xs">{opt.email}</div>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedInvites.includes(opt.id)}
                        onChange={(e) => {
                          setSelectedInvites(prev => e.target.checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id));
                        }}
                      />
                    </label>
                  ))}
                  {inviteOptions.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">No users available</div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowCreateForum(false)}
                  disabled={isCreatingForum}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                  disabled={isCreatingForum || !newForumTitle.trim()}
                >
                  {isCreatingForum ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreateChannel={handleCreateChannel}
        communityName={activeCommunity?.name || 'Community'}
      />

      {/* Invitation Modal */}
      {showInvitationModal && invitationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInvitationModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-lg shadow-xl p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Community Invitation</h3>
              <button
                onClick={() => setShowInvitationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">{invitationData.forum_name}</h4>
                {invitationData.forum_description && (
                  <p className="text-sm text-gray-600 mb-4">{invitationData.forum_description}</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">Invitation Link</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}${invitationData.invitation_link}`}
                    readOnly
                    className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white"
                  />
                  <button
                    onClick={copyInvitationLink}
                    className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>• Anyone with this link can join the community</p>
                <p>• New members will be added to the #{invitationData.default_channel} channel</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forums;