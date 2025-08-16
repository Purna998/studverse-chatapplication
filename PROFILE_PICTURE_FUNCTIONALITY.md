# Profile Picture Functionality

## Overview

The profile picture functionality in StudVerse allows users to upload, display, and manage their profile pictures throughout the application. The profile picture is prominently displayed in the chat dashboard header and automatically updates when a new picture is uploaded.

## Features

### 1. Profile Picture Upload
- **Location**: User Profile Panel (accessible from chat header)
- **Supported Formats**: All image formats (JPEG, PNG, GIF, etc.)
- **File Size Limit**: 5MB maximum
- **Upload Method**: Drag & drop or click to select file

### 2. Profile Picture Display
- **Header Display**: Profile picture is displayed in the chat dashboard header
- **Position**: Left side of the logout icon
- **Size**: 32x32 pixels (w-8 h-8)
- **Styling**: Rounded with border and shadow
- **Fallback**: Default avatar image if no profile picture is set

### 3. Real-time Updates
- **Automatic Refresh**: Profile picture updates immediately after upload
- **Cache Busting**: Prevents browser caching issues
- **Cross-tab Sync**: Updates are synchronized across multiple tabs

## Technical Implementation

### Backend (Django)

#### API Endpoints
- `POST /api/user/profile/upload-picture/` - Upload profile picture
- `GET /api/user/profile/` - Get user profile (includes profile picture URL)
- `PUT /api/user/profile/` - Update user profile

#### Key Functions
```python
# views.py
def upload_profile_picture(request):
    # Handles file upload, validation, and storage
    # Returns updated user data with profile picture URL

def profile_update(request):
    # Returns user profile data including profile picture URL
    # Uses get_profile_picture_url() utility for proper URL generation
```

#### File Storage
- **Location**: `media/profile_pictures/`
- **Naming**: Automatic filename generation
- **Cleanup**: Old profile pictures are automatically deleted when new ones are uploaded

### Frontend (React)

#### Components
1. **ChatHeader.jsx** - Displays profile picture in header
2. **UserProfile.jsx** - Handles profile picture upload
3. **AuthContext.jsx** - Manages user data and updates

#### Key Features
```javascript
// Cache busting for fresh image loads
const getProfilePictureUrl = () => {
  if (user?.profile_picture) {
    const separator = user.profile_picture.includes('?') ? '&' : '?';
    return `${user.profile_picture}${separator}t=${Date.now()}`;
  }
  return defaultAvatarUrl;
};

// Force re-render when profile picture changes
<img 
  src={getProfilePictureUrl()}
  key={`${user?.profile_picture}-${profileImageKey}`}
  className="w-8 h-8 rounded-full object-cover shadow-md border-2 border-white"
/>
```

#### State Management
- **AuthContext**: Centralized user data management
- **Session Storage**: Tab-specific user data storage
- **Real-time Updates**: Immediate UI updates when profile picture changes

## User Experience

### Upload Process
1. User clicks the "+" icon on their profile picture in the User Profile panel
2. File picker opens for image selection
3. Selected image is validated (type and size)
4. Upload progress indicator is shown
5. Success message appears when upload completes
6. Profile picture updates immediately in the header

### Visual Feedback
- **Loading State**: Spinner during upload
- **Success Message**: Green notification when upload succeeds
- **Error Handling**: Red notification for upload failures
- **Fallback Image**: Default avatar if image fails to load

### Responsive Design
- **Mobile Friendly**: Works on all screen sizes
- **Touch Support**: Optimized for touch devices
- **Accessibility**: Proper alt text and ARIA labels

## Security Features

### File Validation
- **Type Checking**: Only image files allowed
- **Size Limits**: Maximum 5MB file size
- **Content Validation**: Server-side file type verification

### Access Control
- **Authentication Required**: Only logged-in users can upload
- **User Isolation**: Users can only upload to their own profile
- **Secure URLs**: Profile picture URLs are properly secured

## Testing

### Test File
Run `python test_profile_picture.py` to test the complete profile picture functionality:

1. **User Registration**: Creates test user
2. **Authentication**: Logs in and gets access token
3. **Profile Retrieval**: Gets initial profile data
4. **File Upload**: Uploads test profile picture
5. **Verification**: Confirms profile picture was updated
6. **URL Testing**: Verifies profile picture URL is accessible
7. **Cleanup**: Removes test files

### Manual Testing
1. Log into the application
2. Click on your profile picture in the header
3. In the User Profile panel, click the "+" icon on your profile picture
4. Select an image file
5. Verify the upload completes successfully
6. Check that the profile picture updates in the header immediately

## Troubleshooting

### Common Issues

1. **Profile picture not updating in header**
   - Check browser console for errors
   - Verify the upload was successful
   - Try refreshing the page

2. **Upload fails**
   - Check file size (must be < 5MB)
   - Verify file is an image
   - Check network connection

3. **Image not displaying**
   - Check if the image URL is accessible
   - Verify the backend is running
   - Check browser console for CORS issues

### Debug Information
- Backend logs show upload progress and errors
- Frontend console shows API call results
- Network tab shows file upload requests

## Future Enhancements

### Planned Features
- **Image Cropping**: Allow users to crop uploaded images
- **Multiple Formats**: Support for WebP and other modern formats
- **Image Optimization**: Automatic compression and resizing
- **Avatar Generation**: Generate avatars from user initials
- **Profile Picture History**: Keep previous profile pictures

### Performance Optimizations
- **CDN Integration**: Serve images from CDN
- **Lazy Loading**: Load profile pictures on demand
- **Image Caching**: Implement proper caching strategies
- **Progressive Loading**: Show low-quality placeholder while loading

## Conclusion

The profile picture functionality provides a seamless user experience with real-time updates, proper error handling, and responsive design. The implementation follows best practices for security, performance, and user experience.
