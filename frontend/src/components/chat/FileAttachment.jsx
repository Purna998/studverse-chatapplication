import React, { useState } from 'react';
import { api } from '../../utils/api';

const FileAttachment = ({ attachment, attachmentType, fileName, fileSize, messageId, onDownload }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const getFileIcon = (type, name) => {
    if (type === 'image' || name?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      return '🖼️';
    } else if (type === 'pdf' || name?.endsWith('.pdf')) {
      return '📄';
    } else if (type === 'document' || name?.match(/\.(doc|docx)$/i)) {
      return '📝';
    } else if (type === 'spreadsheet' || name?.match(/\.(xls|xlsx)$/i)) {
      return '📊';
    } else if (type === 'presentation' || name?.match(/\.(ppt|pptx)$/i)) {
      return '📈';
    } else if (type === 'video' || name?.match(/\.(mp4|webm|ogg|mov)$/i)) {
      return '🎥';
    } else if (type === 'audio' || name?.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return '🎵';
    } else if (type === 'archive' || name?.match(/\.(zip|rar|7z)$/i)) {
      return '📦';
    } else {
      return '📎';
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

  const getFileTypeName = (type, name) => {
    if (type === 'image' || name?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      return 'Image';
    } else if (type === 'pdf' || name?.endsWith('.pdf')) {
      return 'PDF Document';
    } else if (type === 'document' || name?.match(/\.(doc|docx)$/i)) {
      return 'Word Document';
    } else if (type === 'spreadsheet' || name?.match(/\.(xls|xlsx)$/i)) {
      return 'Excel Spreadsheet';
    } else if (type === 'presentation' || name?.match(/\.(ppt|pptx)$/i)) {
      return 'PowerPoint Presentation';
    } else if (type === 'video' || name?.match(/\.(mp4|webm|ogg|mov)$/i)) {
      return 'Video File';
    } else if (type === 'audio' || name?.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return 'Audio File';
    } else if (type === 'archive' || name?.match(/\.(zip|rar|7z)$/i)) {
      return 'Compressed File';
    } else {
      return 'File';
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      if (onDownload) {
        onDownload(attachment);
      } else if (messageId) {
        // Use the secure download endpoint
        const response = await api.chat.downloadAttachment(messageId);
        
        // Create blob and download
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (attachment) {
        // Fallback to direct link
        const link = document.createElement('a');
        link.href = attachment;
        link.download = fileName || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isImage = attachmentType === 'image' || fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = attachmentType === 'video' || fileName?.match(/\.(mp4|webm|ogg|mov)$/i);
  const isAudio = attachmentType === 'audio' || fileName?.match(/\.(mp3|wav|ogg|m4a)$/i);

  return (
    <div className="mt-2">
      {/* File Attachment Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200">
        <div className="flex items-center space-x-3">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">{getFileIcon(attachmentType, fileName)}</span>
            </div>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName || 'Unknown File'}
            </p>
            <p className="text-xs text-gray-500">
              {getFileTypeName(attachmentType, fileName)}
              {fileSize && ` • ${formatFileSize(fileSize)}`}
            </p>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200"
            title="Download file"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Image Preview */}
        {isImage && attachment && (
          <div className="mt-3">
            {!isImageLoaded && !imageError && (
              <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <img
              src={attachment}
              alt={fileName || 'Image attachment'}
              className={`w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity duration-200 ${
                isImageLoaded ? 'block' : 'hidden'
              }`}
              onLoad={() => {
                setIsImageLoaded(true);
                setImageError(false);
              }}
              onError={() => {
                setImageError(true);
                setIsImageLoaded(false);
                console.error('Failed to load image:', attachment);
              }}
              onClick={() => window.open(attachment, '_blank')}
              crossOrigin="anonymous"
            />
            {imageError && (
              <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <span className="text-gray-500 text-sm block">Failed to load image</span>
                  <button
                    onClick={() => {
                      setImageError(false);
                      setIsImageLoaded(false);
                      // Retry loading
                      const img = new Image();
                      img.onload = () => setIsImageLoaded(true);
                      img.onerror = () => setImageError(true);
                      img.src = attachment;
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Preview */}
        {isVideo && attachment && (
          <div className="mt-3">
            <video
              src={attachment}
              controls
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Audio Preview */}
        {isAudio && attachment && (
          <div className="mt-3">
            <audio
              src={attachment}
              controls
              className="w-full"
              preload="metadata"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        )}

        {/* PDF Preview */}
        {attachmentType === 'pdf' && attachment && (
          <div className="mt-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">📄</span>
                <span className="text-sm font-medium text-gray-900">PDF Document</span>
              </div>
              <button
                onClick={() => window.open(attachment, '_blank')}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                Open PDF in new tab
              </button>
            </div>
          </div>
        )}

        {/* Document Preview */}
        {(attachmentType === 'document' || attachmentType === 'spreadsheet' || attachmentType === 'presentation') && (
          <div className="mt-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getFileIcon(attachmentType, fileName)}</span>
                <span className="text-sm text-gray-600">
                  {getFileTypeName(attachmentType, fileName)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click download to save this file
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAttachment;
