# StudVerse Chat Application - Core System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Authentication System](#authentication-system)
4. [Real-time Messaging](#real-time-messaging)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Community Forums](#community-forums)
8. [Group Chat](#group-chat)
9. [Admin System](#admin-system)
10. [Security Features](#security-features)
11. [Deployment](#deployment)

## System Overview

StudVerse is a real-time chat application designed for students, featuring instant messaging, community forums, and group chats. The system provides WhatsApp-like performance with immediate message delivery.

### Core Features
- **🚀 Real-time Messaging**: Instant message delivery with WebSocket
- **👥 User Management**: User profiles and authentication
- **🏛️ Community Forums**: Create and manage discussion channels
- **👥 Group Chat**: Create groups for team discussions
- **📍 Nearby Map**: Find and connect with nearby students
- **🔧 Admin Panel**: User and content management
- **✅ Immediate Message Visibility**: Users see their own messages instantly

## Recent Updates & Fixes

### Message Sender Visibility Fix (Latest)
- **Issue Resolved**: Users couldn't see their own messages immediately after sending
- **Solution**: Immediate UI updates in `handleSendMessage()` function
- **Result**: Messages now appear instantly for senders

### WebSocket Optimization
- Enhanced message handling and duplicate prevention
- Robust connection management with automatic reconnection

## Core Architecture

### Technology Stack
- **Frontend**: React with Vite, Tailwind CSS
- **Backend**: Django with Django REST Framework
- **Database**: MySQL
- **Real-time**: Django Channels with WebSocket
- **Authentication**: JWT tokens
- **Maps**: Google Maps API with Leaflet integration

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Django Backend │    │   WebSocket     │
│                 │    │                 │    │   Channels      │
│ - Authentication│◄──►│ - API Endpoints │◄──►│ - Real-time     │
│ - Chat Interface│    │ - Data Models   │    │   Messaging     │
│ - Admin Panel   │    │ - Community Mgmt│    │                 │
│ - Groups        │    │ - Group Mgmt    │    │                 │
│ - Nearby Map    │    │ - Location Mgmt │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Authentication System

### JWT Token Flow
1. **Login**: User provides credentials
2. **Token Generation**: Backend creates access and refresh tokens
3. **Token Storage**: Frontend stores tokens in sessionStorage
4. **API Requests**: Tokens included in Authorization header
5. **Token Refresh**: Automatic refresh before expiration

### Core Components
- **AuthContext.jsx**: Manages authentication state
- **Login.jsx**: User login interface
- **Register.jsx**: User registration

## Real-time Messaging

### WebSocket Architecture
- **Connection Management**: Persistent WebSocket connections
- **Message Routing**: Efficient message routing using Django Channels
- **Performance**: < 50ms end-to-end latency

### Message Flow
```
User Input → React State Update → WebSocket Send → Backend Processing → Database Save → Broadcast → UI Update
```

### Core Components
- **ChatWindow.jsx**: Main chat interface with immediate message display
- **websocket.js**: WebSocket connection management
- **consumers.py**: Backend WebSocket handling
- **NearbyMapPage.jsx**: Interactive map interface for nearby users
- **maps.js**: Google Maps API configuration and utilities

## Data Models

### User Management
```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    college = models.CharField(max_length=255, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    is_admin = models.BooleanField(default=False)
    location_lat = models.FloatField(blank=True, null=True)
    location_lng = models.FloatField(blank=True, null=True)
    last_location_update = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Conversation System
```python
class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Message System
```python
class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Group System
```python
class Group(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='group_images/', blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class GroupMember(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

class GroupMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_messages')
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
```

### Community Forum System
```python
class Forum(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='forum_images/', blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_forums')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ForumMember(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

class ForumChannel(models.Model):
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE, related_name='channels')
    name = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_forum_channels')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ForumChannelMessage(models.Model):
    channel = models.ForeignKey(ForumChannel, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_channel_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
```

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/refresh/` - Token refresh
- `GET /api/auth/profile/` - User profile

### Chat Management
- `POST /api/chat/send-message/` - Send new message
- `GET /api/chat/conversations/` - Get user conversations
- `GET /api/chat/messages/<conversation_id>/` - Get conversation messages
- `POST /api/chat/mark-read/<conversation_id>/` - Mark conversation as read
- `DELETE /api/chat/messages/<message_id>/` - Delete message

### Group Management
- `GET /api/groups/` - Get user's groups
- `POST /api/groups/create/` - Create new group
- `GET /api/groups/<id>/` - Get group details
- `PUT /api/groups/<id>/update/` - Update group
- `DELETE /api/groups/<id>/delete/` - Delete group
- `GET /api/groups/<id>/members/` - Get group members
- `POST /api/groups/<id>/members/add/` - Add group member
- `DELETE /api/groups/<id>/members/<user_id>/remove/` - Remove member
- `POST /api/groups/<id>/members/<user_id>/promote/` - Promote member
- `GET /api/groups/<id>/messages/` - Get group messages
- `POST /api/groups/<id>/messages/send/` - Send group message

### Community Forum Management
- `GET /api/forums/` - Get public forums
- `POST /api/forums/create/` - Create forum
- `GET /api/forums/<id>/channels/` - Get forum channels
- `POST /api/forums/<id>/channels/create/` - Create forum channel
- `GET /api/forums/<id>/invitation/` - Generate forum invitation
- `POST /api/forums/<id>/join/` - Join forum via invitation
- `GET /api/channels/<id>/messages/` - Get channel messages
- `POST /api/channels/<id>/messages/` - Send channel message

### Admin Operations
- `GET /api/admin/users/` - Get all users
- `POST /api/admin/users/<user_id>/ban/` - Ban user
- `GET /api/admin/conversations/` - Get all conversations
- `GET /api/admin/messages/` - Get all messages
- `GET /api/admin/groups/` - Get all groups
- `GET /api/admin/forums/` - Get all forums

### Location Services
- `GET /api/nearby/users/` - Get nearby users within 10km radius
- `POST /api/user/location/` - Update user's current location
- `GET /api/users/locations/` - Get all users' locations

## Nearby Map

### Location Services
- **Real-time Location Tracking**: Users can share their current location
- **Nearby User Discovery**: Find other students within 10km radius
- **Interactive Map Interface**: Visual map with user markers
- **Location-based Chat**: Start conversations with nearby users
- **Privacy Controls**: Users control their location sharing

### Map Features
- **User Markers**: Custom markers with profile pictures and online status
- **Distance Calculation**: Haversine formula for accurate distance calculation
- **Online Status**: Real-time online/offline indicators
- **Profile Information**: View user details and start chats
- **Location Updates**: Automatic location refresh and updates

### Location Data
- **GPS Coordinates**: Latitude and longitude storage
- **Last Update Tracking**: Timestamp of last location update
- **Online Detection**: Active session monitoring for online status
- **Distance Filtering**: Only show users within 10km radius
- **Privacy Protection**: Location data only shared with nearby users

## Community Forums

### Forum Features
- **Create Forums**: Users can create community forums
- **Channel Management**: Create multiple channels within forums
- **Invitation System**: Generate invitation links for forum access
- **Member Management**: Add and manage forum members
- **Real-time Messaging**: Instant messaging in forum channels

### Forum Structure
- **Forum**: Main community container
- **Channels**: Discussion topics within forums
- **Members**: Users with access to the forum
- **Messages**: Real-time messages in channels

## Group Chat

### Group Features
- **Create Groups**: Users can create group chats
- **Member Management**: Add and remove group members
- **Role Management**: Admin and member roles
- **Real-time Messaging**: Instant messaging in groups
- **Group Settings**: Manage group information and members

### Group Structure
- **Group**: Main group container
- **Members**: Users in the group
- **Messages**: Real-time messages in the group
- **Roles**: Admin and member permissions

## Admin System

### Admin Panel Features
- **User Management**: View, edit, and ban users
- **Conversation Monitoring**: Monitor all conversations
- **Message Management**: View and moderate messages
- **Group Management**: Monitor and manage groups
- **Forum Management**: Monitor and manage forums
- **System Analytics**: Basic usage analytics

### Admin Capabilities
- **User Operations**: Ban, unban, edit user profiles
- **Content Moderation**: Delete inappropriate content
- **System Monitoring**: Monitor system health
- **Group/Forum Management**: Manage groups and forums

## Security Features

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Token Refresh**: Automatic token refresh mechanism
- **Session Management**: Secure session handling
- **Password Security**: Strong password requirements

### Data Security
- **Input Validation**: Comprehensive input validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Cross-site scripting protection
- **CSRF Protection**: Cross-site request forgery protection

### Access Control
- **Role-based Access**: Admin and user permissions
- **Forum Access**: Invitation-based forum access
- **Group Access**: Member-only group access

## Deployment

### Environment Setup
```bash
# Backend Setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend Setup
cd frontend
npm install
npm run dev
```

### Configuration Files
- **Backend**: `backend/backend/settings.py`
- **Frontend**: `frontend/vite.config.js`
- **Database**: MySQL configuration

### Environment Variables
```bash
# Required Environment Variables
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com
DATABASE_URL=mysql://user:password@localhost/dbname
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Production Deployment
- **Web Server**: Nginx with Gunicorn
- **Database**: MySQL for production
- **SSL**: HTTPS with Let's Encrypt

## Troubleshooting

### Common Issues
1. **WebSocket Connection Issues**: Check network connectivity and server status
2. **Message Not Sending**: Verify authentication and WebSocket connection
3. **Database Connection**: Check MySQL connection settings
4. **Forum/Group Access**: Verify user permissions and invitations
5. **Location Services**: Check GPS permissions and Google Maps API key
6. **Nearby Users Not Showing**: Verify location permissions and user online status

### Debug Tools
- **Browser Console**: Frontend debugging and logging
- **Django Debug Toolbar**: Backend performance monitoring
- **WebSocket Inspector**: Real-time connection monitoring

---

## Conclusion

StudVerse provides a robust, real-time chat application with core messaging functionality, community forums, group chats, and location-based user discovery. The recent message sender visibility fix ensures users have immediate feedback when sending messages, enhancing the overall user experience.

The nearby map feature enables students to discover and connect with peers in their vicinity, making it easier to form study groups and build local communities. The system is designed to be scalable and maintainable, with clear separation of concerns and comprehensive error handling. For development and deployment, refer to the individual component documentation and API reference guides.
