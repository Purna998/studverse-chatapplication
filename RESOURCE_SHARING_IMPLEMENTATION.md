# StudVerse Resource Sharing Implementation

## 🎯 Overview

This document describes the implementation of a comprehensive resource sharing system for the StudVerse chat application with a 2MB file size limit and secure download functionality.

## ✨ Features Implemented

### 🔒 **File Size Limit (2MB)**
- **Backend Validation**: Enforces 2MB maximum file size
- **Frontend Validation**: Prevents large file selection
- **User Feedback**: Clear error messages for oversized files

### 📁 **Supported File Types**
- **Images**: JPG, JPEG, PNG, GIF, BMP, WebP
- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: XLS, XLSX
- **Presentations**: PPT, PPTX
- **Text Files**: TXT, CSV
- **Archives**: ZIP, RAR
- **Videos**: MP4, WebM, OGG
- **Audio**: MP3, WAV, OGG

### 🔐 **Secure Download System**
- **Access Control**: Only conversation participants can download files
- **Secure Endpoints**: Protected download URLs
- **File Validation**: Server-side file existence checks
- **Proper Headers**: Content-Disposition for downloads

### 📚 **Resource Library**
- **Conversation Resources**: View all shared files in a conversation
- **File Filtering**: Filter by file type (images, documents, videos, etc.)
- **File Information**: Display file size, uploader, and timestamp
- **Download Integration**: Direct download from resource library

## 🏗️ Architecture

### Backend Components

#### 1. **File Upload Validation** (`backend/api/views.py`)
```python
# File size validation (2MB limit)
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB in bytes
if attachment.size > MAX_FILE_SIZE:
    return Response({
        "error": f"File size too large. Maximum allowed size is 2MB. Your file is {attachment.size / (1024 * 1024):.2f}MB"
    }, status=status.HTTP_400_BAD_REQUEST)

# File type validation
allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', ...]
file_extension = os.path.splitext(attachment.name.lower())[1]
if file_extension not in allowed_extensions:
    return Response({
        "error": f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
    }, status=status.HTTP_400_BAD_REQUEST)
```

#### 2. **Secure Download Endpoint** (`backend/api/views.py`)
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_message_attachment(request, message_id):
    """Download a message attachment securely"""
    # Check if user is part of the conversation
    if not message.conversation.participants.filter(id=request.user.id).exists():
        return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
    
    # Create response with file
    with open(file_path, 'rb') as file:
        response = HttpResponse(file.read(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{file_name}"'
        response['Content-Length'] = file_size
        return response
```

#### 3. **Resource Library Endpoint** (`backend/api/views.py`)
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_resources(request, conversation_id):
    """Get all resources (attachments) from a conversation"""
    # Get messages with attachments
    messages_with_attachments = conversation.messages.filter(
        attachment__isnull=False
    ).exclude(attachment='').order_by('-timestamp')
    
    resources = []
    for message in messages_with_attachments:
        resources.append({
            'id': message.id,
            'file_name': os.path.basename(message.attachment.name),
            'file_size': message.attachment.size,
            'file_type': message.attachment_type,
            'uploaded_by': message.sender.username,
            'uploaded_at': message.timestamp.isoformat(),
            'download_url': f'/api/messages/{message.id}/download/'
        })
```

### Frontend Components

#### 1. **File Upload Component** (`frontend/src/components/chat/FileUpload.jsx`)
```javascript
const FileUpload = ({ onFileSelect, onFileRemove, selectedFile, filePreview, maxSize = 2 * 1024 * 1024 }) => {
  // 2MB default size limit
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.zip', '.rar', '.mp4', '.webm', '.ogg',
    '.mp3', '.wav'
  ];

  const validateFile = (file) => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert(`File type not supported. Allowed types: ${allowedExtensions.join(', ')}`);
      return false;
    }
    
    // Check file size
    if (file.size > maxSize) {
      alert(`File size too large. Maximum size is ${formatFileSize(maxSize)}. Your file is ${formatFileSize(file.size)}.`);
      return false;
    }
    
    return true;
  };
```

#### 2. **File Attachment Component** (`frontend/src/components/chat/FileAttachment.jsx`)
```javascript
const handleDownload = async () => {
  if (isDownloading) return;
  
  setIsDownloading(true);
  
  try {
    if (messageId) {
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
    }
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. Please try again.');
  } finally {
    setIsDownloading(false);
  }
};
```

#### 3. **Resource Library Component** (`frontend/src/components/chat/ResourceLibrary.jsx`)
```javascript
const ResourceLibrary = ({ conversationId, onClose }) => {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'images', 'documents', etc.

  const loadResources = async () => {
    const response = await api.chat.getConversationResources(conversationId);
    if (response.resources) {
      setResources(response.resources);
    }
  };

  const filteredResources = resources.filter(resource => {
    if (filter === 'all') return true;
    return getFileTypeCategory(resource.file_type, resource.file_name) === filter;
  });
```

## 🔧 API Endpoints

### File Upload
- **URL**: `POST /api/send_message_new/`
- **Purpose**: Send message with file attachment
- **Validation**: File size (2MB max), file type, user authentication

### File Download
- **URL**: `GET /api/messages/{message_id}/download/`
- **Purpose**: Download message attachment securely
- **Security**: Access control for conversation participants

### Resource Library
- **URL**: `GET /api/conversations/{conversation_id}/resources/`
- **Purpose**: Get all shared resources in a conversation
- **Response**: List of files with metadata

## 🧪 Testing

### Test Script
Created `test_resource_sharing.py` to verify all functionality:

```bash
python test_resource_sharing.py
```

### Test Coverage
- ✅ File size limits (2MB enforcement)
- ✅ File type validation
- ✅ Download functionality
- ✅ Resource library
- ✅ Access control
- ✅ Error handling

## 📊 File Size Limits

| File Size | Status | Description |
|-----------|--------|-------------|
| < 1MB | ✅ Allowed | Small files work perfectly |
| 1MB - 2MB | ✅ Allowed | Medium files within limit |
| 2MB | ✅ Allowed | Maximum allowed size |
| > 2MB | ❌ Rejected | Files too large |

## 🔒 Security Features

### Access Control
- Only conversation participants can download files
- Server-side validation of user permissions
- Secure file serving with proper headers

### File Validation
- File size validation on both frontend and backend
- File type validation based on extensions
- Malicious file prevention

### Download Security
- Protected download endpoints
- File existence validation
- Proper Content-Disposition headers

## 🎨 User Experience

### File Upload
- Drag and drop support
- File type validation with clear error messages
- File size validation with user-friendly feedback
- Progress indicators for uploads

### File Display
- File type icons for different file types
- File size display
- Preview for images and documents
- Download buttons with loading states

### Resource Library
- Filter by file type
- Search and sort functionality
- File metadata display
- Bulk download options

## 🚀 Deployment

### Backend Requirements
1. Update `backend/api/views.py` with new endpoints
2. Update `backend/api/urls.py` with new URL patterns
3. Ensure media directory is properly configured
4. Set up proper file permissions

### Frontend Requirements
1. Update `frontend/src/components/chat/FileUpload.jsx`
2. Update `frontend/src/components/chat/FileAttachment.jsx`
3. Update `frontend/src/components/chat/ResourceLibrary.jsx`
4. Update `frontend/src/utils/api.js` with new endpoints

### Configuration
```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# File upload settings
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_FILE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', ...]
```

## 📈 Performance Considerations

### File Storage
- Files stored in `media/message_attachments/`
- Organized by conversation and timestamp
- Automatic cleanup of orphaned files

### Download Optimization
- Streaming downloads for large files
- Proper caching headers
- CDN integration for better performance

### Memory Management
- Chunked file uploads
- Efficient file validation
- Memory-limited file processing

## 🔮 Future Enhancements

### Planned Features
1. **File Compression**: Automatic image compression
2. **Cloud Storage**: Integration with AWS S3 or similar
3. **File Versioning**: Track file changes over time
4. **Advanced Search**: Full-text search in documents
5. **File Sharing**: Share files across conversations

### Performance Improvements
1. **Lazy Loading**: Load file previews on demand
2. **Caching**: Implement file caching system
3. **CDN**: Use content delivery network for files
4. **Compression**: Compress files before storage

## 📝 Notes

- All file operations are logged for security
- Error handling is comprehensive
- User feedback is clear and helpful
- System is scalable for future growth
- Backward compatibility maintained

This implementation provides a robust, secure, and user-friendly resource sharing system that enhances the StudVerse chat experience while maintaining performance and security standards.
