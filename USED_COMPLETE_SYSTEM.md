# StudVerse Chat Application - Complete System Documentation

## Project Overview
StudVerse is a comprehensive real-time chat application designed specifically for Information Technology students in Nepalgunj, Nepal. The system provides a centralized, academic-focused communication platform that connects students across different colleges and institutions.

## System Architecture

### Backend Architecture
- **Framework**: Django 5.0.7 (Python-based)
- **API Framework**: Django REST Framework
- **Authentication**: JWT (JSON Web Tokens) with SimpleJWT
- **Database**: MySQL 8.0 with mysqlclient driver
- **Real-time Communication**: Django Channels with WebSocket support
- **ASGI Server**: Daphne for WebSocket handling
- **File Storage**: Local file system with Django's FileField

### Frontend Architecture
- **Framework**: React 19.1.0 with Vite build tool
- **Styling**: Tailwind CSS 3.4.17 with custom components
- **UI Components**: Material Tailwind React components
- **Maps**: Leaflet.js with react-leaflet for location-based features
- **State Management**: React Context API
- **HTTP Client**: Built-in fetch API with custom API utilities

## Core Technologies & Dependencies

### Backend Dependencies (requirements.txt)
```
asgiref                    # ASGI utilities
Django                     # Web framework
django-cors-headers        # CORS handling
djangorestframework        # REST API framework
djangorestframework-simplejwt  # JWT authentication
PyJWT                      # JWT token handling
pytz                       # Timezone support
sqlparse                   # SQL parsing
mysqlclient==2.2.7         # MySQL database connector
python-dotenv              # Environment variable management
channels                   # WebSocket support
daphne                     # ASGI server
requests                   # HTTP requests
google-auth                # Google OAuth authentication
google-auth-oauthlib       # Google OAuth library
google-auth-httplib2       # Google OAuth HTTP client
```

### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "@material-tailwind/react": "^2.1.10",
    "leaflet": "^1.9.4",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-leaflet": "^5.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.30.1",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.30.1",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.3.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "vite": "^7.0.4"
  }
}
```

## Database Schema

### Core Models
1. **User Model** (Custom AbstractUser)
   - email, full_name, profile_picture, is_admin
   - google_id, is_google_user (for OAuth)
   - location_lat, location_lng (for nearby features)

2. **College Model**
   - name, location, timestamps

3. **Group & GroupMember Models**
   - Group: name, description, image, created_by
   - GroupMember: user, group, role, joined_at

4. **Forum & ForumMember Models**
   - Forum: title, description, image, created_by
   - ForumMember: user, forum, role, joined_at

5. **ForumChannel & ForumChannelMessage Models**
   - ForumChannel: forum, name, created_by
   - ForumChannelMessage: channel, sender, content

6. **Conversation & Message Models**
   - Conversation: participants, created_at
   - Message: conversation, sender, content

7. **TabSession Model**
   - user, tab_id, session_key, user_agent, last_activity

## Key Features & Components

### 1. Authentication System
- **JWT-based Authentication**: Access and refresh tokens
- **Google OAuth Integration**: Seamless login with Google accounts
- **Custom User Management**: Extended user model with profile pictures
- **Admin Authentication**: Special admin privileges and access control

### 2. Real-time Messaging
- **WebSocket Implementation**: Django Channels with AsyncWebsocketConsumer
- **Ultra-fast Messaging**: Optimized message queue and processing
- **Message Types**: Text messages only
- **Read Receipts**: Message read status tracking
- **Tab Session Management**: Multi-tab support with session tracking

### 3. Real-time Communication
- **Instant Messaging**: Fast text-based communication
- **Message History**: Persistent message storage and retrieval
- **Conversation Management**: Organized chat threads
- **Message Status**: Read receipts and delivery confirmations

### 4. Location-based Features
- **Leaflet.js Integration**: Interactive maps for nearby users
- **Geolocation Services**: Browser-based location detection
- **Nearby User Discovery**: Find users within proximity
- **Location Updates**: Real-time location tracking

### 5. Group & Forum Management
- **Group Creation**: User-created groups with member management
- **Forum System**: Community-based forums with channels
- **Role-based Access**: Admin, moderator, and member roles
- **Invitation System**: Forum invitation links

### 6. Admin Panel
- **User Management**: View, delete, and manage users
- **Message Management**: Monitor and delete messages
- **Group & Forum Administration**: Manage communities
- **College Management**: Add and manage educational institutions

## API Endpoints

### Authentication
- `POST /api/token/` - JWT token generation
- `POST /api/token/refresh/` - Token refresh
- `POST /api/user/register/` - User registration
- `POST /api/google-auth/` - Google OAuth authentication

### User Management
- `GET /api/user/profile/` - Get user profile
- `PUT /api/user/profile/` - Update profile
- `POST /api/user/profile-picture/` - Upload profile picture
- `GET /api/users/` - List users
- `GET /api/users/search/` - Search users

### Messaging
- `GET /api/conversations/` - Get user conversations
- `GET /api/conversations/{id}/messages/` - Get conversation messages
- `POST /api/messages/send/` - Send message
- `DELETE /api/messages/{id}/` - Delete message

### Groups & Forums
- `GET /api/groups/` - List groups
- `POST /api/groups/` - Create group
- `GET /api/forums/` - List forums
- `POST /api/forums/` - Create forum
- `GET /api/forums/{id}/channels/` - List forum channels

### Location Services
- `PUT /api/user/location/` - Update user location
- `GET /api/nearby-users/` - Get nearby users

### Admin Endpoints
- `GET /api/admin/users/` - Admin: Get all users
- `DELETE /api/admin/users/{id}/` - Admin: Delete user
- `GET /api/admin/messages/` - Admin: Get all messages
- `DELETE /api/admin/messages/` - Admin: Delete all messages

## WebSocket Implementation

### Connection Details
- **Endpoint**: `ws://localhost:8000/ws/chat/`
- **Authentication**: JWT token via query parameters
- **Message Format**: JSON with type and data fields

### Message Types
- `chat_message`: Individual chat messages
- `group_message`: Group chat messages
- `forum_message`: Forum channel messages
- `typing_indicator`: Real-time typing indicators
- `read_receipt`: Message read confirmations

## Frontend Components

### Core Components
1. **Authentication Components**
   - Login.jsx - User login with Google OAuth
   - Register.jsx - User registration
   - AuthContext.jsx - Authentication state management

2. **Chat Components**
   - ChatLayout.jsx - Main chat interface
   - ChatWindow.jsx - Message display and input
   - Sidebar.jsx - Navigation and user list

3. **Map Components**
   - NearbyMapPage.jsx - Leaflet.js map implementation
   - User markers with profile pictures
   - Real-time location updates

4. **Admin Components**
   - AdminPanel.jsx - Admin dashboard
   - UsersSection.jsx - User management
   - MessagesSection.jsx - Message monitoring

### Styling System
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Material Tailwind React components
- **Responsive Design**: Mobile-first approach
- **Dark Mode Support**: Theme switching capabilities

## Development & Deployment

### Development Setup
```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

### Database Configuration
- **Engine**: MySQL 8.0
- **Host**: localhost:3308
- **Database**: studverse
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci

### Environment Variables
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SECRET_KEY=your_django_secret_key
```

## Performance Optimizations

### Backend Optimizations
- **In-Memory Channel Layer**: High-capacity message processing
- **Database Indexing**: Optimized queries for messaging
- **Message Queue Optimization**: Efficient message handling
- **WebSocket Connection Pooling**: Scalable real-time connections

### Frontend Optimizations
- **Vite Build Tool**: Fast development and optimized builds
- **React 19**: Latest React features and performance
- **Code Splitting**: Lazy loading for better performance
- **Image Optimization**: Efficient profile picture handling

## Security Features

### Authentication Security
- **JWT Token Expiration**: 30-minute access tokens
- **Secure Token Storage**: HttpOnly cookies for refresh tokens
- **Google OAuth Verification**: Server-side token validation
- **Password Hashing**: Django's built-in password security

### Data Security
- **CORS Configuration**: Proper cross-origin handling
- **Input Validation**: Secure message content validation
- **SQL Injection Prevention**: Django ORM protection
- **XSS Protection**: Content Security Policy headers

## Monitoring & Logging

### System Monitoring
- **WebSocket Connection Tracking**: Real-time connection monitoring
- **Message Queue Monitoring**: Performance metrics
- **Error Logging**: Comprehensive error tracking
- **User Activity Tracking**: Session and usage analytics

This documentation covers all actively used components and technologies in the StudVerse chat application system, providing a complete reference for development, deployment, and maintenance.
