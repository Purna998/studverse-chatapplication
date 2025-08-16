# Resource Sharing & File Upload System

## Overview

The StudVerse chat application now includes a comprehensive resource sharing and file upload system that allows users to share various types of files in their conversations and manage them through a dedicated resource library.

## Features

### 🎯 Core Features

1. **Multi-format File Upload**
   - Images (JPG, PNG, GIF, WebP)
   - Documents (PDF, DOC, DOCX)
   - Spreadsheets (XLS, XLSX)
   - Presentations (PPT, PPTX)
   - Audio files (MP3, WAV, OGG)
   - Video files (MP4, WebM, OGG)
   - Archives (ZIP, RAR)
   - Text files (TXT, CSV)

2. **Enhanced File Upload UI**
   - Drag & drop support
   - File preview for images
   - Progress indicators
   - File validation (type & size)
   - Maximum file size: 10MB

3. **Resource Library**
   - Browse all shared files in a conversation
   - Search and filter by file type
   - Sort by date, name, size, or type
   - Download files directly
   - Open files in new tabs

4. **File Attachment Display**
   - Rich file previews with proper icons
   - Image thumbnails
   - Video and audio players
   - PDF viewer integration
   - Download functionality

## Technical Implementation

### Backend Components

#### Models
- **Message Model**: Enhanced with `attachment` and `attachment_type` fields
- **File Storage**: Uses Django's FileField with organized upload paths

#### API Endpoints

1. **File Upload**
   ```
   POST /api/send_message_new/
   ```
   - Handles file uploads with messages
   - Supports FormData for file transmission
   - Automatic file type detection

2. **Resource Library**
   ```
   GET /api/conversations/{conversation_id}/resources/
   ```
   - Returns all files shared in a conversation
   - Includes file metadata and statistics

3. **User File Statistics**
   ```
   GET /api/user/file-stats/
   ```
   - Provides user's file upload statistics
   - Shows file type distribution and recent uploads

#### File Type Detection
```python
def determine_attachment_type(file_name):
    file_name = file_name.lower()
    if file_name.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
        return 'image'
    elif file_name.endswith('.pdf'):
        return 'pdf'
    elif file_name.endswith(('.doc', '.docx')):
        return 'document'
    elif file_name.endswith(('.xls', '.xlsx')):
        return 'spreadsheet'
    elif file_name.endswith(('.ppt', '.pptx')):
        return 'presentation'
    elif file_name.endswith(('.mp4', '.webm', '.ogg', '.mov')):
        return 'video'
    elif file_name.endswith(('.mp3', '.wav', '.ogg', '.m4a')):
        return 'audio'
    elif file_name.endswith(('.zip', '.rar', '.7z')):
        return 'archive'
    else:
        return 'file'
```

### Frontend Components

#### 1. FileUpload Component
- **Location**: `frontend/src/components/chat/FileUpload.jsx`
- **Features**:
  - Drag & drop interface
  - File validation
  - Progress indicators
  - File preview for images
  - File size formatting

#### 2. FileAttachment Component
- **Location**: `frontend/src/components/chat/FileAttachment.jsx`
- **Features**:
  - Rich file display with icons
  - Image previews with loading states
  - Video and audio players
  - PDF viewer integration
  - Download functionality

#### 3. ResourceLibrary Component
- **Location**: `frontend/src/components/chat/ResourceLibrary.jsx`
- **Features**:
  - Modal interface for browsing files
  - Search and filtering
  - Sorting options
  - File statistics
  - Bulk download support

## Usage Guide

### Uploading Files

1. **Via Drag & Drop**
   - Drag files directly onto the upload area
   - Files are automatically validated and previewed

2. **Via File Picker**
   - Click the attachment button (📎)
   - Select files from your device
   - Files are validated before upload

3. **File Validation**
   - File type must be supported
   - File size must be under 10MB
   - Invalid files show error messages

### Managing Resources

1. **Accessing Resource Library**
   - Click the document icon (📄) in chat header
   - Only available for existing conversations

2. **Searching Files**
   - Use the search bar to find files by name
   - Search also includes message content

3. **Filtering Files**
   - Filter by file type (All, Images, Documents, etc.)
   - Sort by date, name, size, or type

4. **Downloading Files**
   - Click download button (⬇️) for individual files
   - Files open in new tabs for viewing

## File Storage Structure

```
media/
├── message_attachments/     # Chat message files
├── group_attachments/       # Group chat files
├── forum_images/           # Forum images
├── group_images/           # Group images
├── profile_pictures/       # User profile pictures
└── forum_images/           # Forum images
```

## Security Features

1. **File Type Validation**
   - Server-side file type checking
   - Whitelist of allowed file extensions
   - MIME type validation

2. **File Size Limits**
   - Maximum 10MB per file
   - Configurable size limits
   - Client and server-side validation

3. **Access Control**
   - Users can only access files from their conversations
   - Conversation participants only
   - Admin controls for file management

## Performance Optimizations

1. **File Compression**
   - Images are served with appropriate compression
   - Thumbnail generation for large images
   - Lazy loading for file previews

2. **Caching**
   - File URLs are cached
   - CDN integration for static files
   - Browser caching for frequently accessed files

3. **Progressive Loading**
   - File previews load progressively
   - Loading states for better UX
   - Error handling for failed uploads

## API Reference

### Send Message with File
```javascript
const formData = new FormData();
formData.append('receiver_email', 'user@example.com');
formData.append('content', 'Check out this file!');
formData.append('attachment', file);

const response = await fetch('/api/send_message_new/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData
});
```

### Get Conversation Resources
```javascript
const response = await fetch(`/api/conversations/${conversationId}/resources/`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});
```

### Get User File Statistics
```javascript
const response = await fetch('/api/user/file-stats/', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});
```

## Error Handling

### Common Error Scenarios

1. **File Too Large**
   - Error: "File size too large. Maximum size is 10 MB."
   - Solution: Compress or resize the file

2. **Unsupported File Type**
   - Error: "File type not supported. Please select a valid file."
   - Solution: Convert to supported format

3. **Upload Failed**
   - Error: "Failed to upload file"
   - Solution: Check network connection and try again

4. **Access Denied**
   - Error: "Access denied"
   - Solution: Ensure you're part of the conversation

## Future Enhancements

### Planned Features

1. **File Versioning**
   - Track file versions
   - Rollback to previous versions
   - Version comparison

2. **Advanced Search**
   - Full-text search in documents
   - OCR for image text
   - Metadata search

3. **File Sharing Permissions**
   - Granular access controls
   - Expiring links
   - Password protection

4. **Cloud Integration**
   - Google Drive integration
   - Dropbox sync
   - OneDrive support

5. **File Collaboration**
   - Real-time document editing
   - Comments on files
   - Collaborative annotations

## Troubleshooting

### Common Issues

1. **Files Not Uploading**
   - Check file size and type
   - Verify network connection
   - Clear browser cache

2. **Preview Not Loading**
   - Check file format support
   - Verify file integrity
   - Try refreshing the page

3. **Download Issues**
   - Check file permissions
   - Verify file exists on server
   - Try alternative download method

### Debug Information

Enable debug mode to see detailed error messages:
```javascript
localStorage.setItem('debug', 'true');
```

## Support

For technical support or feature requests:
- Create an issue in the project repository
- Contact the development team
- Check the documentation for common solutions

---

*This documentation is maintained by the StudVerse development team. Last updated: [Current Date]*
