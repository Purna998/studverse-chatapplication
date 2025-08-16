import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import FileAttachment from './FileAttachment';

const ResourceLibrary = ({ conversationId, onClose }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'images', 'documents', 'videos', 'audio', 'archives'

  useEffect(() => {
    loadResources();
  }, [conversationId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.chat.getConversationResources(conversationId);
      
      if (response.resources) {
        setResources(response.resources);
      } else {
        setError('Failed to load resources');
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeCategory = (fileType, fileName) => {
    if (fileType === 'image' || fileName?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      return 'images';
    } else if (fileType === 'pdf' || fileType === 'document' || fileType === 'spreadsheet' || fileType === 'presentation' || 
               fileName?.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i)) {
      return 'documents';
    } else if (fileType === 'video' || fileName?.match(/\.(mp4|webm|ogg|mov)$/i)) {
      return 'videos';
    } else if (fileType === 'audio' || fileName?.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return 'audio';
    } else if (fileType === 'archive' || fileName?.match(/\.(zip|rar|7z)$/i)) {
      return 'archives';
    }
    return 'other';
  };

  const filteredResources = resources.filter(resource => {
    if (filter === 'all') return true;
    return getFileTypeCategory(resource.file_type, resource.file_name) === filter;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'images': return '🖼️';
      case 'documents': return '📄';
      case 'videos': return '🎥';
      case 'audio': return '🎵';
      case 'archives': return '📦';
      default: return '📎';
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'images': return 'Images';
      case 'documents': return 'Documents';
      case 'videos': return 'Videos';
      case 'audio': return 'Audio';
      case 'archives': return 'Archives';
      default: return 'Other';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📚</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Resource Library</h2>
              <p className="text-sm text-gray-500">
                {resources.length} shared resource{resources.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {['all', 'images', 'documents', 'videos', 'audio', 'archives'].map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === category
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category === 'all' ? '📁 All' : `${getCategoryIcon(category)} ${getCategoryName(category)}`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading resources...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">❌</span>
                </div>
                <p className="text-red-600 mb-2">Failed to load resources</p>
                <button
                  onClick={loadResources}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📁</span>
                </div>
                <p className="text-gray-500">
                  {filter === 'all' ? 'No resources shared yet' : `No ${filter} found`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-start space-x-3">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-xl">
                          {getCategoryIcon(getFileTypeCategory(resource.file_type, resource.file_name))}
                        </span>
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={resource.file_name}>
                        {resource.file_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(resource.file_size)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Shared by {resource.uploaded_by} • {formatDate(resource.uploaded_at)}
                      </p>
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={() => {
                        // Use the secure download endpoint
                        window.open(`/api/messages/${resource.id}/download/`, '_blank');
                      }}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200"
                      title="Download file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredResources.length} of {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </span>
            <span>Maximum file size: 2MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceLibrary;
