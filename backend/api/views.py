from django.shortcuts import render
from django.contrib.auth.models import User
from .serializers import UserSerializer, ProfileUpdateSerializer, CollegeSerializer, GroupSerializer, ForumSerializer, ConversationSerializer, MessageSerializer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, TokenError, AccessToken
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import (
    College, Group, GroupMember, GroupMessage, Forum, ForumMember, ForumChannel, ForumChannelMessage, ChatConvo, 
    UserProfile, TabSession, Conversation, Message, User
)
from .serializers import (
    CollegeSerializer, GroupSerializer, GroupMemberSerializer, GroupMessageSerializer,
    ForumSerializer, ForumMemberSerializer, ForumChannelSerializer, ForumChannelMessageSerializer, ChatConvoSerializer, UserProfileSerializer, ProfileUpdateSerializer,
    TabSessionSerializer, ConversationSerializer, MessageSerializer, UserSerializer
)
from django.db.models import Q
from django.http import HttpResponse
import os
import time
from django.conf import settings
from .utils import get_profile_picture_url, save_profile_picture_file, delete_profile_picture_file
from .google_oauth import GoogleOAuth

# Updated views.py functions to support full names


# Google OAuth Authentication
@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Handle Google OAuth authentication
    """
    try:
        # Get the ID token from the request
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({
                'error': 'ID token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize Google OAuth
        google_oauth = GoogleOAuth()
        
        # Verify the Google token
        user_info = google_oauth.verify_google_token(id_token)
        if not user_info:
            return Response({
                'error': 'Invalid Google token'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create user
        user = google_oauth.get_or_create_user(user_info)
        if not user:
            return Response({
                'error': 'Failed to create or get user'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create JWT tokens
        tokens = google_oauth.create_tokens(user)
        if not tokens:
            return Response({
                'error': 'Failed to create authentication tokens'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': tokens['user']
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in Google OAuth: {e}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin permission check decorator
def admin_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            profile = UserProfile.objects.get(user=request.user)
            if not profile.is_admin:
                return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        except UserProfile.DoesNotExist:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        return view_func(request, *args, **kwargs)
    return wrapper


# Get all colleges for dropdown
@api_view(['GET'])
@permission_classes([AllowAny])
def get_colleges(request):
    try:
        colleges = College.objects.all().order_by('name')
        serializer = CollegeSerializer(colleges, many=True)
        return Response({
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in get_colleges: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Public Forums
@api_view(['GET'])
@permission_classes([AllowAny])
def get_forums(request):
    try:
        forums = Forum.objects.all().order_by('-created_at')
        serializer = ForumSerializer(forums, many=True, context={'request': request})
        return Response({'data': serializer.data}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in get_forums: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Create a forum (community)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_forum(request):
    try:
        # Support multipart for image upload
        data = request.data.copy()
        serializer = ForumSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            forum = serializer.save(created_by=request.user)
            # Create default #general channel
            try:
                ForumChannel.objects.get_or_create(forum=forum, name='general', defaults={'created_by': request.user})
            except Exception as ce:
                print(f"create_forum: error creating default channel: {ce}")
            # Add creator as admin member and any invited user IDs as members
            try:
                ForumMember.objects.get_or_create(forum=forum, user=request.user, defaults={'role': 'admin'})
                # Expect invited members as list in request.data.getlist('members') for multipart
                invited_ids = request.data.getlist('members') or data.getlist('members')
                for uid in invited_ids:
                    try:
                        invitee = User.objects.get(id=int(uid))
                        ForumMember.objects.get_or_create(forum=forum, user=invitee, defaults={'role': 'member'})
                    except Exception as ie:
                        print(f"create_forum: invite add failed for {uid}: {ie}")
            except Exception as me:
                print(f"create_forum: member add error: {me}")
            return Response({'message': 'Forum created', 'data': ForumSerializer(forum, context={'request': request}).data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in create_forum: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Create a channel (sub-forum) under a forum
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_forum_channel(request, forum_id):
    try:
        forum = Forum.objects.get(id=forum_id)
        name = request.data.get('name')
        if not name or not name.strip():
            return Response({'error': 'Channel name is required'}, status=status.HTTP_400_BAD_REQUEST)
        channel = ForumChannel.objects.create(forum=forum, name=name.strip(), created_by=request.user)
        serializer = ForumChannelSerializer(channel, context={'request': request})
        return Response({'message': 'Channel created', 'data': serializer.data}, status=status.HTTP_201_CREATED)
    except Forum.DoesNotExist:
        return Response({'error': 'Forum not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in create_forum_channel: {e}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# List channels of a forum
@api_view(['GET'])
@permission_classes([AllowAny])
def list_forum_channels(request, forum_id):
    try:
        forum = Forum.objects.get(id=forum_id)
        channels = forum.channels.all().order_by('name')
        serializer = ForumChannelSerializer(channels, many=True, context={'request': request})
        return Response({'data': serializer.data}, status=status.HTTP_200_OK)
    except Forum.DoesNotExist:
        return Response({'error': 'Forum not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in list_forum_channels: {e}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Messages in a channel
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def forum_channel_messages(request, channel_id):
    try:
        channel = ForumChannel.objects.get(id=channel_id)
        if request.method == 'GET':
            messages = channel.messages.all().order_by('timestamp')
            serializer = ForumChannelMessageSerializer(messages, many=True, context={'request': request})
            return Response({'data': serializer.data}, status=status.HTTP_200_OK)
        # POST
        content = request.data.get('content')
        if not content or not content.strip():
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        msg = ForumChannelMessage.objects.create(channel=channel, sender=request.user, content=content.strip())
        serializer = ForumChannelMessageSerializer(msg, context={'request': request})
        return Response({'message': 'Message sent', 'data': serializer.data}, status=status.HTTP_201_CREATED)
    except ForumChannel.DoesNotExist:
        return Response({'error': 'Channel not found'}, status=status.HTTP_404_NOT_FOUND)


# Generate invitation link for a forum
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_forum_invitation(request, forum_id):
    try:
        forum = Forum.objects.get(id=forum_id)
        
        # Check if user is a member of the forum
        try:
            ForumMember.objects.get(forum=forum, user=request.user)
        except ForumMember.DoesNotExist:
            return Response({'error': 'You must be a member of this forum to generate invitation links'}, status=status.HTTP_403_FORBIDDEN)
        
        # Generate invitation link
        invitation_link = f"/forums/{forum_id}/join"
        
        return Response({
            'forum_id': forum.id,
            'forum_name': forum.title,
            'forum_description': forum.description,
            'invitation_link': invitation_link,
            'default_channel': 'general'
        }, status=status.HTTP_200_OK)
        
    except Forum.DoesNotExist:
        return Response({'error': 'Forum not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in generate_forum_invitation: {e}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Join forum via invitation link
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_forum_via_invitation(request, forum_id):
    try:
        forum = Forum.objects.get(id=forum_id)
        
        # Check if user is already a member
        try:
            ForumMember.objects.get(forum=forum, user=request.user)
            return Response({'message': 'You are already a member of this forum'}, status=status.HTTP_200_OK)
        except ForumMember.DoesNotExist:
            pass
        
        # Add user as member
        ForumMember.objects.create(forum=forum, user=request.user, role='member')
        
        # Get the default general channel
        try:
            general_channel = ForumChannel.objects.get(forum=forum, name='general')
            default_channel_id = general_channel.id
        except ForumChannel.DoesNotExist:
            # If no general channel exists, get the first available channel
            first_channel = forum.channels.first()
            default_channel_id = first_channel.id if first_channel else None
        
        return Response({
            'message': f'Successfully joined {forum.title}',
            'forum_id': forum.id,
            'forum_name': forum.title,
            'default_channel_id': default_channel_id
        }, status=status.HTTP_200_OK)
        
    except Forum.DoesNotExist:
        return Response({'error': 'Forum not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in join_forum_via_invitation: {e}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        print(f"Error in forum_channel_messages: {e}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin Views

# Get all users (admin only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_users(request):
    try:
        # Check if user is admin (check both User.is_admin and UserProfile.is_admin)
        is_admin = False
        try:
            # First check User model's is_admin field
            if hasattr(request.user, 'is_admin') and request.user.is_admin:
                is_admin = True
        except:
            pass
        
        # Also check UserProfile.is_admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.is_admin:
                is_admin = True
        except UserProfile.DoesNotExist:
            pass
        
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all().order_by('-date_joined')
        # Exclude staff accounts from the admin-visible user list if requested by product
        users = users.exclude(is_staff=True)
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response({
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_get_users: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Get all messages (admin only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_messages(request):
    try:
        # Check if user is admin (check both User.is_admin and UserProfile.is_admin)
        is_admin = False
        try:
            # First check User model's is_admin field
            if hasattr(request.user, 'is_admin') and request.user.is_admin:
                is_admin = True
        except:
            pass
        
        # Also check UserProfile.is_admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.is_admin:
                is_admin = True
        except UserProfile.DoesNotExist:
            pass
        
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get messages from both old and new systems
        old_messages = ChatConvo.objects.all().order_by('-timestamp')
        new_messages = Message.objects.all().order_by('-timestamp')
        
        message_data = []
        
        # Add old messages
        for message in old_messages:
            message_data.append({
                'id': f"old_{message.id}",
                'sender': message.sender.username,
                'receiver': message.receiver.username,
                'message': message.message,
                'timestamp': message.timestamp,
                'type': 'old'
            })
        
        # Add new messages
        for message in new_messages:
            message_data.append({
                'id': f"new_{message.id}",
                'sender': message.sender.username,
                'receiver': message.receiver.username,
                'message': message.content,
                'timestamp': message.timestamp,
                'type': 'new'
            })
        
        # Sort by timestamp
        message_data.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({
            'data': message_data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_get_messages: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Delete all messages and conversations (admin only)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_all_messages(request):
    try:
        # Check if user is admin (check both User.is_admin and UserProfile.is_admin)
        is_admin = False
        try:
            # First check User model's is_admin field
            if hasattr(request.user, 'is_admin') and request.user.is_admin:
                is_admin = True
        except:
            pass
        
        # Also check UserProfile.is_admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.is_admin:
                is_admin = True
        except UserProfile.DoesNotExist:
            pass
        
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get counts before deletion
        old_message_count = ChatConvo.objects.count()
        new_message_count = Message.objects.count()
        conversation_count = Conversation.objects.count()
        
        # Delete all messages and conversations
        ChatConvo.objects.all().delete()
        Message.objects.all().delete()
        Conversation.objects.all().delete()
        
        return Response({
            'message': 'All messages and conversations deleted successfully',
            'deleted': {
                'old_messages': old_message_count,
                'new_messages': new_message_count,
                'conversations': conversation_count,
                'total': old_message_count + new_message_count + conversation_count
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_delete_all_messages: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Delete specific user (admin only)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    try:
        # Check if user is admin (check both User.is_admin and UserProfile.is_admin)
        is_admin = False
        try:
            # First check User model's is_admin field
            if hasattr(request.user, 'is_admin') and request.user.is_admin:
                is_admin = True
        except:
            pass
        
        # Also check UserProfile.is_admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.is_admin:
                is_admin = True
        except UserProfile.DoesNotExist:
            pass
        
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get the user to delete
        try:
            user_to_delete = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Prevent deleting admin users
        if user_to_delete.is_admin or (hasattr(user_to_delete, 'profile') and user_to_delete.profile.is_admin):
            return Response({"error": "Cannot delete admin users"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent deleting self
        if user_to_delete.id == request.user.id:
            return Response({"error": "Cannot delete your own account"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Store username for response
        username = user_to_delete.username
        
        # Delete user (this will cascade delete related data)
        user_to_delete.delete()
        
        return Response({
            'message': f'User "{username}" deleted successfully'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_delete_user: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Get all groups (admin only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_groups(request):
    try:
        # Check if user is admin (check both User.is_admin and UserProfile.is_admin)
        is_admin = False
        try:
            # First check User model's is_admin field
            if hasattr(request.user, 'is_admin') and request.user.is_admin:
                is_admin = True
        except:
            pass
        
        # Also check UserProfile.is_admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.is_admin:
                is_admin = True
        except UserProfile.DoesNotExist:
            pass
        
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        groups = Group.objects.all().order_by('-created_at')
        serializer = GroupSerializer(groups, many=True, context={'request': request})
        return Response({
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_get_groups: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Get all forums (admin only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_forums(request):
    try:
        # Check if user is admin (check both User.is_admin and UserProfile.is_admin)
        is_admin = False
        try:
            # First check User model's is_admin field
            if hasattr(request.user, 'is_admin') and request.user.is_admin:
                is_admin = True
        except:
            pass
        
        # Also check UserProfile.is_admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.is_admin:
                is_admin = True
        except UserProfile.DoesNotExist:
            pass
        
        if not is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        forums = Forum.objects.all().order_by('-created_at')
        serializer = ForumSerializer(forums, many=True, context={'request': request})
        return Response({
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_get_forums: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Add new college (admin only)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_add_college(request):
    try:
        print(f"DEBUG: admin_add_college called by user: {request.user.username}")
        print(f"DEBUG: Request data: {request.data}")
        print(f"DEBUG: Request headers: {request.headers}")
        
        # Check if user is admin
        try:
            profile = UserProfile.objects.get(user=request.user)
            print(f"DEBUG: User profile found, is_admin: {profile.is_admin}")
            if not profile.is_admin:
                print(f"DEBUG: User is not admin")
                return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        except UserProfile.DoesNotExist:
            print(f"DEBUG: User profile does not exist")
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CollegeSerializer(data=request.data)
        print(f"DEBUG: Serializer is valid: {serializer.is_valid()}")
        if not serializer.is_valid():
            print(f"DEBUG: Serializer errors: {serializer.errors}")
        
        if serializer.is_valid():
            college = serializer.save()
            print(f"DEBUG: College saved successfully: {college.name}")
            return Response({
                'message': 'College added successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in admin_add_college: {e}")
        import traceback
        traceback.print_exc()
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Add new group (admin only)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_add_group(request):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.save(created_by=request.user)
            return Response({
                'message': 'Group added successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in admin_add_group: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Add new forum (admin only)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_add_forum(request):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ForumSerializer(data=request.data)
        if serializer.is_valid():
            forum = serializer.save(created_by=request.user)
            return Response({
                'message': 'Forum added successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in admin_add_forum: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Delete college (admin only)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_college(request, college_id):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            college = College.objects.get(id=college_id)
            college.delete()
            return Response({
                'message': 'College deleted successfully'
            }, status=status.HTTP_200_OK)
        except College.DoesNotExist:
            return Response({"error": "College not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in admin_delete_college: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Delete group (admin only)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_group(request, group_id):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            group = Group.objects.get(id=group_id)
            group.delete()
            return Response({
                'message': 'Group deleted successfully'
            }, status=status.HTTP_200_OK)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in admin_delete_group: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Delete forum (admin only)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_forum(request, forum_id):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            forum = Forum.objects.get(id=forum_id)
            forum.delete()
            return Response({
                'message': 'Forum deleted successfully'
            }, status=status.HTTP_200_OK)
        except Forum.DoesNotExist:
            return Response({"error": "Forum not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in admin_delete_forum: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Updated CreateUserView to handle first_name and last_name
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            user = serializer.save()
            
            # Handle college_name if provided
            college_name = request.data.get('college_name')
            if college_name:
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.college_name = college_name
                profile.save()
            
            response_data = {
                'message': 'User created successfully',
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip() if user.first_name or user.last_name else user.username,
                'college_name': college_name
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"CreateUserView: Error creating user: {e}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Add a new view to get user profile details
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request, username):
    try:
        user = User.objects.filter(username=username).first()
        if not user:
            return Response(data={"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        user_serializer = UserSerializer(user)
        return Response(data={"data": user_serializer.data}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Profile update view for current user
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_update(request):
    try:
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        if request.method == 'GET':
            # Return user data with file-based profile picture URL
            profile_picture_url = get_profile_picture_url(request, profile.profile_picture)
            
            user_data = {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "full_name": request.user.get_full_name() if request.user.get_full_name() else request.user.username,
                "profile_picture": profile_picture_url,
                "description": profile.description,
                "college_name": profile.college_name,
                "is_admin": profile.is_admin,
            }
            
            return Response({
                "data": user_data
            }, status=status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            print(f"Profile update request data: {request.data}")
            serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
            print(f"Serializer is valid: {serializer.is_valid()}")
            if not serializer.is_valid():
                print(f"Serializer errors: {serializer.errors}")
            
            if serializer.is_valid():
                updated_profile = serializer.save()
                print(f"Profile updated successfully: {updated_profile.description}")
                
                # Return updated user data with file-based profile picture URL
                profile_picture_url = get_profile_picture_url(request, updated_profile.profile_picture)
                
                user_data = {
                    "id": request.user.id,
                    "username": request.user.username,
                    "email": request.user.email,
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                    "full_name": request.user.get_full_name() if request.user.get_full_name() else request.user.username,
                    "profile_picture": profile_picture_url,
                    "description": updated_profile.description,
                    "college_name": updated_profile.college_name,
                    "is_admin": updated_profile.is_admin,
                }
                
                return Response({
                    "message": "Profile updated successfully",
                    "data": user_data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        print(f"Error in profile_update: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Profile picture upload view
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    try:
        print(f"Upload request method: {request.method}")
        print(f"Upload request content type: {request.content_type}")
        print(f"Upload request files: {request.FILES}")
        print(f"Upload request data: {request.data}")
        
        if 'profile_picture' not in request.FILES:
            print("No profile_picture in request.FILES")
            return Response({
                "error": "No profile picture provided"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        print(f"Profile created: {created}, User: {request.user.username}")
        
        uploaded_file = request.FILES['profile_picture']
        print(f"Uploaded file: {uploaded_file.name}, size: {uploaded_file.size}, type: {uploaded_file.content_type}")
        
        # Validate file type
        if not uploaded_file.content_type.startswith('image/'):
            return Response({
                "error": "File must be an image"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 5MB)
        if uploaded_file.size > 5 * 1024 * 1024:
            return Response({
                "error": "File size must be less than 5MB"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete old profile picture if it exists
        if profile.profile_picture:
            try:
                if os.path.isfile(profile.profile_picture.path):
                    os.remove(profile.profile_picture.path)
                    print(f"Old profile picture deleted: {profile.profile_picture.path}")
            except Exception as e:
                print(f"Error deleting old profile picture: {e}")
        
        # Save new profile picture using Django's ImageField
        profile.profile_picture = uploaded_file
        profile.save()
        print(f"Profile picture saved to database: {profile.profile_picture}")

        # Refresh profile from database to ensure latest data
        profile.refresh_from_db()

        # Get the full URL for response
        file_url = request.build_absolute_uri(profile.profile_picture.url)
        print(f"Profile picture URL: {file_url}")
        
        # Return updated user data
        user_data = {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "full_name": request.user.get_full_name() if request.user.get_full_name() else request.user.username,
            "profile_picture": file_url,
            "description": profile.description,
            "college_name": profile.college_name,
        }
        
        return Response({
            "success": True,
            "message": "Profile picture uploaded successfully",
            "data": user_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in upload_profile_picture: {e}")
        import traceback
        traceback.print_exc()
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Delete profile picture view
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_profile_picture(request):
    try:
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        if profile.profile_picture:
            # Delete the file using utility function
            delete_profile_picture_file(profile.profile_picture)
            
            # Clear the field in database
            profile.profile_picture = None
            profile.save()
            
            # Return updated user data
            user_data = {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "full_name": request.user.get_full_name() if request.user.get_full_name() else request.user.username,
                "profile_picture": None,
                "description": profile.description,
            }
            
            return Response({
                "message": "Profile picture deleted successfully",
                "data": user_data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "No profile picture to delete"
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        print(f"Error in delete_profile_picture: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
 
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = TokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        # Call the parent method to get the token data
        response = super().post(request, *args, **kwargs)
        
        # Extract tokens from response data
        access_token = response.data['access']
        refresh_token = response.data['refresh']
        
        # Get user data with admin status
        try:
            # Decode the access token to get user info
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken(access_token)
            user_id = token.payload.get('user_id')
            
            if user_id:
                user = User.objects.get(id=user_id)
                user_serializer = UserSerializer(user, context={'request': request})
                response.data['user'] = user_serializer.data
                print(f"Login response user data: {user_serializer.data}")
        except Exception as e:
            print(f"Error getting user data: {e}")
        
        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,  # Prevents JavaScript access
            secure=False,    # Use True in production (HTTPS)
            expires=timezone.now() + timedelta(days=1)  # Set expiration
        )
        
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=False,  
            expires=timezone.now() + timedelta(days=1)  # Set expiration
        )
        return response


@api_view(["GET"])
def check_token(request):
    access_token = request.COOKIES.get('access_token')
    refresh_token = request.COOKIES.get('refresh_token')
    if not access_token or not refresh_token:
        return Response(data={"error": "No Token provided."}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        decode_token = AccessToken(access_token) #decodes the token and validates it.
        data = decode_token.payload #To get user dictionary of data stores on token.
        user_id = data.get('user_id')
        user = User.objects.filter(id=user_id).first()
        if user:
            user_serializer = UserSerializer(user)
            return Response(data={"data": user_serializer.data}, status=status.HTTP_200_OK)
    except Exception as e:
        print("Token decoding error:", e, ". Starting generating new access token")
        # access token is invalid, check for the refresh token
        try:
            refresh_decoded = RefreshToken(refresh_token)
            new_access_token = str(refresh_decoded.access_token) # Generate a new access token
            
            response = Response(data={"message": "New access token generated."}, status=status.HTTP_200_OK)
            response.set_cookie(
                key='access_token',
                value=new_access_token,
                httponly=True,
                secure=False,
                expires=timezone.now() + timedelta(days=1)  # Set expiration
            )
            return response

        except Exception as e:
            print("Refresh token error:", e)
            return Response(data={"error": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
            
    return Response(data={"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(["GET"])
def get_conversation(request, sender, receiver):
    try:
        user = User.objects.filter(username=sender).first()
        user2 = User.objects.filter(username=receiver).first()
        res_data = []
        
        if not user or not user2:
            return Response(data={"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        convos = ChatConvo.objects.filter(
            (Q(sender=user) & Q(receiver=user2)) | (Q(sender=user2) & Q(receiver=user))
        ).order_by('-timestamp')
        
        if convos:
            for convo in convos:
                local_time = timezone.localtime(convo.timestamp)
                res_data.append({
                    "sender": convo.sender.username,
                    "receiver": convo.receiver.username,
                    "time": local_time.strftime("%H:%M"),
                    "message": convo.message
                })

        return Response(data={"data": res_data}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_conversation: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get__last_convo(request, sender, receiver):
    try:
        user = User.objects.filter(username=sender).first()
        user2 = User.objects.filter(username=receiver).first()
        
        if not user or not user2:
            return Response(data={"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        convo = ChatConvo.objects.filter(
            (Q(sender=user) & Q(receiver=user2)) | (Q(sender=user2) & Q(receiver=user))
        ).last()
        
        if not convo:
            return Response(data={"error": "No conversation found"}, status=status.HTTP_404_NOT_FOUND)
        
        local_time = timezone.localtime(convo.timestamp)
        res_data = {
            "message": convo.message,
            "time": local_time.strftime("%H:%M"),
        }
        return Response(data={"data": res_data}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get__last_convo: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    try:
        sender_username = request.data.get('sender')
        receiver_username = request.data.get('receiver')
        message_text = request.data.get('message')
        
        if not all([sender_username, receiver_username, message_text]):
            return Response(
                {"error": "Missing required fields: sender, receiver, message"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sender = User.objects.filter(username=sender_username).first()
        receiver = User.objects.filter(username=receiver_username).first()
        
        if not sender or not receiver:
            return Response(
                {"error": "Sender or receiver not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create and save the message
        chat_message = ChatConvo.objects.create(
            sender=sender,
            receiver=receiver,
            message=message_text
        )
        
        return Response({
            "message": "Message sent successfully",
            "id": chat_message.id,
            "timestamp": chat_message.timestamp
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Error in send_message: {e}")
        return Response(
            {"error": "Internal server error"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Restored authentication requirement
def list_users(request):
    # Debug authentication information
    print(f"\n\n==== DEBUG: /api/users/ REQUEST ====")
    print(f"Request headers: {request.headers}")
    print(f"Authorization header: {request.headers.get('Authorization')}")
    print(f"Request cookies: {request.COOKIES}")
    print(f"Request user: {request.user}")
    print(f"Request user is authenticated: {request.user.is_authenticated}")
    print(f"Request auth: {request.auth}")
    print(f"==== END DEBUG ====\n\n")
    
    # If user is not authenticated, return 401
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # Exclude the current user and admin user
        users = User.objects.exclude(id=request.user.id).exclude(username='admin')
        data = []
        
        for u in users:
            try:
                # Get profile picture URL using utility function
                profile_picture_url = None
                if hasattr(u, 'profile') and u.profile.profile_picture:
                    profile_picture_url = get_profile_picture_url(request, u.profile.profile_picture)
                
                user_data = {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "full_name": u.get_full_name() if u.get_full_name() else u.username,
                    "profile_picture": profile_picture_url,
                    "description": u.profile.description if hasattr(u, 'profile') else None,
                    "college_name": u.profile.college_name if hasattr(u, 'profile') else None,
                }
                
                data.append(user_data)
            except Exception as e:
                print(f"Error processing user {u.username}: {e}")
                # Still add the user with basic info
                user_data = {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "full_name": u.get_full_name() if u.get_full_name() else u.username,
                    "profile_picture": None,
                    "description": None,
                    "college_name": None,
                }
                data.append(user_data)
        
        print(f"Returning {len(data)} users")
        return Response(data)
        
    except Exception as e:
        print(f"Error in list_users: {e}")
        return Response({"error": "Failed to load users"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Debug view to catch all requests and see what's happening
@api_view(['GET', 'POST', 'PUT', 'DELETE'])
def debug_all_requests(request):
    print(f"DEBUG: Request received")
    print(f"  Method: {request.method}")
    print(f"  Path: {request.path}")
    print(f"  URL: {request.build_absolute_uri()}")
    print(f"  Headers: {dict(request.headers)}")
    print(f"  Data: {request.data}")
    print(f"  Files: {list(request.FILES.keys()) if request.FILES else []}")
    
    return Response({
        "debug": "Request caught by debug view",
        "method": request.method,
        "path": request.path,
        "url": request.build_absolute_uri(),
        "headers": dict(request.headers),
        "data": request.data,
        "files": list(request.FILES.keys()) if request.FILES else []
    }, status=status.HTTP_200_OK)

# Simple test endpoint to verify routing
@api_view(['GET', 'POST'])
def test_upload_endpoint(request):
    return Response({
        "message": "Test endpoint working",
        "method": request.method,
        "url": request.path,
        "data": request.data,
        "files": list(request.FILES.keys()) if request.FILES else []
    }, status=status.HTTP_200_OK)

# Test endpoint to list uploaded profile pictures
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_profile_pictures(request):
    try:
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'profile_pictures')
        if not os.path.exists(upload_dir):
            return Response({
                "message": "No profile pictures directory found",
                "files": []
            }, status=status.HTTP_200_OK)
        
        files = []
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            if os.path.isfile(file_path):
                file_size = os.path.getsize(file_path)
                file_url = f"{request.build_absolute_uri('/')[:-1]}{settings.MEDIA_URL}profile_pictures/{filename}"
                files.append({
                    "filename": filename,
                    "size": file_size,
                    "url": file_url
                })
        
        return Response({
            "message": f"Found {len(files)} profile pictures",
            "files": files
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error listing profile pictures: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    print(f"DEBUG: search_users called with user: {request.user}, authenticated: {request.user.is_authenticated}")
    prefix = request.GET.get('q', '').strip()
    
    if not prefix:
        print("DEBUG: Empty search prefix")
        return Response([], status=200)
    
    try:
        # Enhanced search with comprehensive matching
        search_query = Q()
        search_query |= Q(username__icontains=prefix)
        search_query |= Q(first_name__icontains=prefix)
        search_query |= Q(last_name__icontains=prefix)
        search_query |= Q(email__icontains=prefix)
        search_query |= Q(full_name__icontains=prefix)
        
        # For single character searches, also include prefix matches
        if len(prefix) == 1:
            prefix_query = Q()
            prefix_query |= Q(username__istartswith=prefix)
            prefix_query |= Q(first_name__istartswith=prefix)
            prefix_query |= Q(last_name__istartswith=prefix)
            prefix_query |= Q(email__istartswith=prefix)
            prefix_query |= Q(full_name__istartswith=prefix)
            search_query |= prefix_query
        
        users = User.objects.filter(search_query).exclude(id=request.user.id).distinct()
        users = users.order_by('username', 'email')
        users = users[:50]
        
        # Prepare response data with profile information
        data = []
        for user in users:
            try:
                # Get user profile with select_related for efficiency
                profile = UserProfile.objects.get(user=user)
                profile_picture_url = None
                
                # Get profile picture URL if it exists
                if profile.profile_picture:
                    profile_picture_url = request.build_absolute_uri(profile.profile_picture.url)
                
            except UserProfile.DoesNotExist:
                profile_picture_url = None
                profile = None
            
            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "full_name": user.get_full_name() if user.get_full_name() else user.username,
                "profile_picture": profile_picture_url,
                "description": profile.description if profile else None,
                "college_name": profile.college_name if profile else None,
            }
            data.append(user_data)
        
        print(f"DEBUG: search_users returning {len(data)} users")
        return Response(data, status=200)
        
    except Exception as e:
        print(f"ERROR: search_users exception: {e}")
        return Response({"error": "Internal server error"}, status=500)


# Location management endpoints
@api_view(['GET'])
def get_nearby_users(request):
    """Get nearby users based on current user's location"""
    try:
        # Get current user's location
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user has location data
        if not user.location_lat or not user.location_lng:
            return Response({'error': 'User location not found. Please update your location first.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate distance and find nearby users (within 10km radius)
        from math import radians, cos, sin, asin, sqrt
        
        def calculate_distance(lat1, lon1, lat2, lon2):
            """Calculate distance between two points using Haversine formula"""
            R = 6371  # Earth's radius in kilometers
            
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            distance = R * c
            return distance
        
        user_lat = float(user.location_lat)
        user_lon = float(user.location_lng)
        
        # Get all other users with recent locations
        nearby_users = []
        all_users = User.objects.exclude(id=user.id).filter(
            location_lat__isnull=False,
            location_lng__isnull=False
        ).select_related('profile')
        
        for other_user in all_users:
            distance = calculate_distance(user_lat, user_lon, float(other_user.location_lat), float(other_user.location_lng))
            
            # Only include users within 10km radius
            if distance <= 10:
                # Check if user is online (active in last 5 minutes)
                from datetime import timedelta
                now = timezone.now()
                five_minutes_ago = now - timedelta(minutes=5)
                
                # Check if user has active tab sessions in last 5 minutes
                active_sessions = TabSession.objects.filter(
                    user=other_user,
                    last_activity__gte=five_minutes_ago,
                    is_active=True
                ).exists()
                
                # Also check if location was updated recently (within 5 minutes)
                location_recent = other_user.last_location_update and other_user.last_location_update >= five_minutes_ago
                
                is_online = active_sessions or location_recent
                
                # Only include online users in nearby list
                if is_online:
                    user_profile = other_user.profile
                    profile_picture_url = get_profile_picture_url(request, user_profile.profile_picture) if user_profile.profile_picture else None
                    print(f"User {other_user.username} profile picture URL: {profile_picture_url}")
                    
                    nearby_users.append({
                        'id': other_user.id,
                        'username': other_user.username,
                        'full_name': f"{other_user.first_name} {other_user.last_name}".strip() or other_user.username,
                        'email': other_user.email,
                        'profile_picture': profile_picture_url,
                        'location': {
                            'lat': float(other_user.location_lat),
                            'lng': float(other_user.location_lng)
                        },
                        'distance': round(distance, 1),
                        'college': user_profile.college_name or 'Unknown',
                        'is_online': is_online,
                        'last_seen': other_user.last_location_update.isoformat() if other_user.last_location_update else None
                    })
        
        # Sort by distance
        nearby_users.sort(key=lambda x: x['distance'])
        
        return Response({
            'data': nearby_users,
            'user_location': {
                'lat': user_lat,
                'lng': user_lon
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_nearby_users: {e}")
        return Response({'error': 'Failed to get nearby users'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def update_user_location(request):
    """Update user's current location"""
    try:
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not latitude or not longitude:
            return Response({'error': 'Latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user's location directly in the User model
        user.location_lat = float(latitude)
        user.location_lng = float(longitude)
        user.last_location_update = timezone.now()
        user.save()
        
        return Response({
            'message': 'Location updated successfully',
            'location': {
                'lat': float(latitude),
                'lng': float(longitude)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in update_user_location: {e}")
        return Response({'error': 'Failed to update location'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_locations(request):
    try:
        # Get all users' latest locations
        locations = []
        users = User.objects.exclude(id=request.user.id).filter(
            location_lat__isnull=False,
            location_lng__isnull=False
        )
        
        for user in users:
            locations.append({
                "user_id": user.id,
                "username": user.username,
                "latitude": float(user.location_lat),
                "longitude": float(user.location_lng),
                "timestamp": user.last_location_update.isoformat() if user.last_location_update else None,
                "is_online": True,  # Assume online if location is recent
                "last_seen": user.last_location_update.isoformat() if user.last_location_update else None
            })
        
        return Response(locations, status=200)
        
    except Exception as e:
        print(f"ERROR: get_user_locations exception: {e}")
        return Response({"error": "Internal server error"}, status=500)

# Debug endpoint to check authentication
@api_view(['GET'])
def debug_auth(request):
    """Debug endpoint to check authentication status"""
    auth_header = request.headers.get('Authorization', '')
    print(f"DEBUG: Auth header: {auth_header}")
    
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        print(f"DEBUG: Token: {token[:20]}...")  # Show first 20 chars
        
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            print(f"DEBUG: Token valid, user_id: {user_id}")
            
            user = User.objects.get(id=user_id)
            print(f"DEBUG: User found: {user.username}")
            
            return Response({
                'authenticated': True,
                'user': user.username,
                'user_id': user_id
            })
        except Exception as e:
            print(f"DEBUG: Token validation error: {e}")
            return Response({
                'authenticated': False,
                'error': str(e)
            })
    else:
        print("DEBUG: No Bearer token found")
        return Response({
            'authenticated': False,
            'error': 'No Bearer token found'
        })

@api_view(['GET'])
def test_auth_simple(request):
    """Simple test endpoint to check if authentication is working"""
    print(f"TEST: Request method: {request.method}")
    print(f"TEST: Request headers: {dict(request.headers)}")
    print(f"TEST: Authorization header: {request.headers.get('Authorization')}")
    print(f"TEST: Request user: {request.user}")
    print(f"TEST: User is authenticated: {request.user.is_authenticated}")
    
    return Response({
        'message': 'Test endpoint reached',
        'user': str(request.user),
        'is_authenticated': request.user.is_authenticated,
        'auth_header': request.headers.get('Authorization'),
        'all_headers': dict(request.headers)
    }, status=status.HTTP_200_OK)

# New API endpoints for dynamic chat system

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_conversations(request):
    # Debug authentication
    print(f"DEBUG: User authenticated: {request.user.is_authenticated}")
    print(f"DEBUG: User: {request.user.username if request.user.is_authenticated else 'None'}")
    print(f"DEBUG: Auth header: {request.headers.get('Authorization')}")
    """Get all conversations for the logged-in user"""
    try:
        user = request.user
        
        # Add tab session info to response
        response_data = {
            'data': [],
            'tab_session': {
                'tab_id': getattr(request, 'tab_id', None),
                'session_key': getattr(request, 'session_key', None),
                'is_primary': True  # Will be updated based on tab manager logic
            }
        }
        
        # Get conversations where user is a participant
        conversations = Conversation.objects.filter(
            participants=user
        ).order_by('-updated_at')
        
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        response_data['data'] = serializer.data
        
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in get_user_conversations: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_user_by_email(request):
    """Search for a user by exact email"""
    try:
        email = request.GET.get('email', '').strip()
        if not email:
            return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            # Don't return the current user
            if user == request.user:
                return Response({"error": "Cannot search for yourself"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get user profile info
            profile_picture = None
            try:
                if hasattr(user, 'profile') and user.profile.profile_picture:
                    profile_picture = user.profile.profile_picture.url
            except:
                pass
            
            return Response({
                'found': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.get_full_name() or user.username,
                    'profile_picture': profile_picture
                }
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({
                'found': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error in search_user_by_email: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_messages(request, conversation_id):
    """Get all messages for a specific conversation"""
    try:
        user = request.user
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            # Check if user is part of this conversation
            if not conversation.participants.filter(id=user.id).exists():
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            
            # Mark messages as read for the current user (messages not sent by the user)
            conversation.messages.filter(is_read=False).exclude(sender=user).update(is_read=True)
            
            messages = conversation.messages.all()
            serializer = MessageSerializer(messages, many=True)
            return Response({
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error in get_conversation_messages: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def send_message_new(request):
    # Debug authentication
    print(f"DEBUG: User authenticated: {request.user.is_authenticated}")
    print(f"DEBUG: User: {request.user.username if request.user.is_authenticated else 'None'}")
    print(f"DEBUG: Auth header: {request.headers.get('Authorization')}")
    print(f"DEBUG: Request data: {request.data}")
    """Send a message and create conversation if needed"""
    try:
        sender = request.user
        
        # Handle both JSON and FormData
        if request.content_type and 'application/json' in request.content_type:
            receiver_email = request.data.get('receiver_email')
            content = request.data.get('content')
            real_time = request.data.get('real_time', False)
        else:
            # Handle FormData
            receiver_email = request.data.get('receiver_email')
            content = request.data.get('content')
            real_time = request.data.get('real_time', False)
        
        print(f"DEBUG: receiver_email: {receiver_email}")
        print(f"DEBUG: content: {content}")
        print(f"DEBUG: real_time: {real_time}")
        
        if not receiver_email:
            return Response({"error": "receiver_email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Content is required (no attachments allowed)
        if not content:
            return Response({"error": "Message content is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            receiver = User.objects.get(email=receiver_email)
            print(f"DEBUG: Receiver found: {receiver.username}")
        except User.DoesNotExist:
            print(f"DEBUG: Receiver not found: {receiver_email}")
            return Response({"error": "Receiver not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if sender == receiver:
            return Response({"error": "Cannot send message to yourself"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find or create conversation using participants
        conversation = None
        try:
            # Try to find existing conversation between these two users
            conversation = Conversation.objects.filter(
                participants=sender
            ).filter(
                participants=receiver
            ).first()
            print(f"DEBUG: Existing conversation found: {conversation.id if conversation else 'None'}")
        except Exception as e:
            print(f"Error finding conversation: {e}")
        
        if not conversation:
            # Create new conversation
            conversation = Conversation.objects.create()
            conversation.participants.add(sender, receiver)
            print(f"DEBUG: New conversation created: {conversation.id}")
        
        # Create the message (no attachments)
        message_data = {
            'conversation': conversation,
            'sender': sender,
            'content': content
        }
        
        print(f"DEBUG: Creating message with data: {message_data}")
        
        message = Message.objects.create(**message_data)
        print(f"DEBUG: Message created successfully: {message.id}")
        
        # Update conversation's updated_at timestamp
        conversation.save()  # This will update the updated_at field
        
        # Serialize the message for response
        message_serializer = MessageSerializer(message, context={'request': request})
        print(f"DEBUG: Message serialized successfully")
        
        # Send WebSocket notification to receiver to ensure they see the new conversation
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            import time
            
            channel_layer = get_channel_layer()
            receiver_room = f'chat_{receiver.username}'
            
            print(f"DEBUG: Channel layer: {channel_layer}")
            print(f"DEBUG: Receiver room: {receiver_room}")
            print(f"DEBUG: Sender room: chat_{sender.username}")
            
            # Enhanced WebSocket message data
            ws_message_data = {
                'type': 'chat_message',
                'message': content,
                'sender': sender.username,
                'receiver': receiver.username,
                'message_id': message.id,
                'conversation_id': conversation.id,
                'timestamp': int(time.time()),
                'is_new_conversation': not conversation.created_at or (timezone.now() - conversation.created_at).seconds < 5,
                'sender_full_name': sender.get_full_name() or sender.username,
                'sender_email': sender.email
            }
            
            # Send to receiver's room
            receiver_message = {
                'type': 'chat_message',
                'message': content,
                'sender': sender.username,
                'receiver': receiver.username,
                'message_id': message.id,
                'conversation_id': conversation.id,
                'timestamp': int(time.time()),
                'is_new_conversation': not conversation.created_at or (timezone.now() - conversation.created_at).seconds < 5,
                'sender_full_name': sender.get_full_name() or sender.username,
                'sender_email': sender.email
            }
            
            print(f"DEBUG: Sending to receiver room {receiver_room}: {receiver_message}")
            async_to_sync(channel_layer.group_send)(receiver_room, receiver_message)
            
            # Also send to sender's room for confirmation
            sender_room = f'chat_{sender.username}'
            sender_message = {
                'type': 'chat_message',
                'message': content,
                'sender': sender.username,
                'receiver': receiver.username,
                'message_id': message.id,
                'conversation_id': conversation.id,
                'timestamp': int(time.time()),
                'is_new_conversation': not conversation.created_at or (timezone.now() - conversation.created_at).seconds < 5,
                'sender_full_name': sender.get_full_name() or sender.username,
                'sender_email': sender.email,
                'message_type': 'message_sent'  # Use message_type instead of type to avoid conflict
            }
            
            print(f"DEBUG: Sending to sender room {sender_room}: {sender_message}")
            async_to_sync(channel_layer.group_send)(sender_room, sender_message)
            
            print(f"DEBUG: WebSocket notifications sent to {receiver.username} and {sender.username}")
            print(f"DEBUG: Receiver room: {receiver_room}")
            print(f"DEBUG: Sender room: {sender_room}")
            
        except Exception as ws_error:
            print(f"DEBUG: WebSocket notification failed: {ws_error}")
            import traceback
            traceback.print_exc()
        
        return Response({
            'message': 'Message sent successfully',
            'conversation_id': conversation.id,
            'message_data': message_serializer.data,
            'is_new_conversation': not conversation.created_at or (timezone.now() - conversation.created_at).seconds < 5
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Error in send_message_new: {e}")
        import traceback
        traceback.print_exc()
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_conversation_read(request, conversation_id):
    """Mark all messages in a conversation as read for the current user"""
    try:
        user = request.user
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            # Check if user is part of this conversation
            if not conversation.participants.filter(id=user.id).exists():
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            
            # Mark all messages in the conversation as read for this user
            conversation.messages.filter(is_read=False).exclude(sender=user).update(is_read=True)
            
            return Response({
                'message': 'Conversation marked as read'
            }, status=status.HTTP_200_OK)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error in mark_conversation_read: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tab_sessions(request):
    """Get active tab sessions for the current user (debug endpoint)"""
    try:
        from .utils import get_user_active_sessions
        
        user = request.user
        sessions = get_user_active_sessions(user)
        
        session_data = []
        for session in sessions:
            session_data.append({
                'tab_id': session.tab_id,
                'session_key': session.session_key,
                'user_agent': session.user_agent,
                'last_activity': session.last_activity.isoformat(),
                'created_at': session.created_at.isoformat(),
                'is_active': session.is_active
            })
        
        return Response({
            'user': user.username,
            'active_sessions': session_data,
            'total_sessions': len(session_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_tab_sessions: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Group Views
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_group(request):
    try:
        print(f"=== CREATE GROUP DEBUG ===")
        print(f"Request method: {request.method}")
        print(f"Request user: {request.user.username}")
        print(f"Request data: {request.data}")
        print(f"Request files: {request.FILES}")
        print(f"Request headers: {dict(request.headers)}")
        print(f"=== END DEBUG ===")
        
        # Validate required fields
        if not request.data.get('name'):
            return Response({
                'error': 'Group name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the group
        group_data = {
            'name': request.data.get('name'),
            'description': request.data.get('description', ''),
            'created_by': request.user
        }
        
        print(f"Group data to create: {group_data}")
        
        # Handle group image if provided
        if 'image' in request.FILES:
            group_data['image'] = request.FILES['image']
            print(f"Image provided: {request.FILES['image'].name}")
        
        group = Group.objects.create(**group_data)
        print(f"Group created with ID: {group.id}")
        
        # Add creator as admin
        creator_membership, created = GroupMember.objects.get_or_create(
            group=group,
            user=request.user,
            defaults={'role': 'admin'}
        )
        if not created:
            # If membership already exists, ensure they're admin
            creator_membership.role = 'admin'
            creator_membership.save()
        print(f"Creator added as admin: {request.user.username}")
        
        # Add other members if provided
        # Handle multipart FormData (QueryDict) where 'members' can appear multiple times
        # and also handle JSON bodies where 'members' could be a list or single value
        member_ids = []
        try:
            if hasattr(request.data, 'getlist'):
                member_ids = request.data.getlist('members')
            else:
                member_ids = request.data.get('members', [])
        except Exception as e:
            print(f"Error getting member IDs: {e}")
            member_ids = []

        # Normalize to list
        if member_ids is None:
            member_ids = []
        if isinstance(member_ids, (str, int)):
            member_ids = [member_ids]

        print(f"Member IDs to add (normalized): {member_ids}")
        
        added_members = []
        for member_id in member_ids:
            try:
                uid = int(member_id)
            except (ValueError, TypeError):
                print(f"Skipping invalid member id: {member_id}")
                continue
            try:
                user = User.objects.get(id=uid)
                if user != request.user:  # Don't add creator again
                    membership, created = GroupMember.objects.get_or_create(
                        group=group,
                        user=user,
                        defaults={'role': 'member'}
                    )
                    if created:
                        print(f"Added member: {user.username}")
                        added_members.append(user.username)
                    else:
                        print(f"Member already exists: {user.username}")
                else:
                    print(f"Skipping creator: {user.username}")
            except User.DoesNotExist:
                print(f"User with ID {uid} not found")
                continue
        
        # Verify members were added correctly
        total_members = group.members.count()
        print(f"Total members in group: {total_members}")
        print(f"Group members: {[m.user.username for m in group.members.all()]}")
        
        serializer = GroupSerializer(group, context={'request': request})
        response_data = {
            'success': True,
            'message': f'Group created successfully with {total_members} members',
            'data': serializer.data,
            'added_members': added_members,
            'total_members': total_members
        }
        print(f"Response data: {response_data}")
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Error creating group: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to create group'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_groups(request):
    try:
        print(f"=== GET USER GROUPS DEBUG ===")
        print(f"Request user: {request.user.username} (ID: {request.user.id})")
        
        # Get groups where user is a member
        user_groups = Group.objects.filter(members__user=request.user)
        print(f"Found {user_groups.count()} groups for user {request.user.username}")
        
        # Debug: List all group memberships for this user
        user_memberships = GroupMember.objects.filter(user=request.user)
        print(f"User memberships: {[(m.group.name, m.role) for m in user_memberships]}")
        
        serializer = GroupSerializer(user_groups, many=True, context={'request': request})
        
        response_data = {
            'success': True,
            'data': serializer.data,
            'debug_info': {
                'user_id': request.user.id,
                'username': request.user.username,
                'total_groups': user_groups.count(),
                'memberships': [(m.group.name, m.role) for m in user_memberships]
            }
        }
        
        print(f"Response data: {response_data}")
        print(f"=== END DEBUG ===")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error getting user groups: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to get groups'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_details(request, group_id):
    try:
        print(f"=== GET GROUP DETAILS DEBUG ===")
        print(f"Request user: {request.user.username} (ID: {request.user.id})")
        print(f"Group ID: {group_id}")
        
        group = Group.objects.get(id=group_id)
        print(f"Group found: {group.name}")
        
        # Check if user is a member
        user_membership = group.members.filter(user=request.user).first()
        if not user_membership:
            print(f"User {request.user.username} is not a member of group {group.name}")
            return Response({
                'error': 'You are not a member of this group'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"User {request.user.username} is a member with role: {user_membership.role}")
        
        serializer = GroupSerializer(group, context={'request': request})
        response_data = {
            'success': True,
            'data': serializer.data,
            'debug_info': {
                'user_role': user_membership.role,
                'total_members': group.members.count(),
                'members': [(m.user.username, m.role) for m in group.members.all()]
            }
        }
        
        print(f"Response data: {response_data}")
        print(f"=== END DEBUG ===")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        print(f"Group with ID {group_id} not found")
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error getting group details: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to get group details'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_members(request, group_id):
    try:
        group = Group.objects.get(id=group_id)
        
        # Check if user is a member
        if not group.members.filter(user=request.user).exists():
            return Response({
                'error': 'You are not a member of this group'
            }, status=status.HTTP_403_FORBIDDEN)
        
        members = group.members.all()
        serializer = GroupMemberSerializer(members, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error getting group members: {e}")
        return Response({
            'error': 'Failed to get group members'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_group_member(request, group_id):
    try:
        group = Group.objects.get(id=group_id)
        
        # Check if user is admin
        user_membership = group.members.filter(user=request.user).first()
        if not user_membership or user_membership.role != 'admin':
            return Response({
                'error': 'Only group admins can add members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                'error': 'User ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is already a member
        if group.members.filter(user=user).exists():
            return Response({
                'error': 'User is already a member of this group'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Add user as member
        GroupMember.objects.create(
            group=group,
            user=user,
            role='member'
        )
        
        return Response({
            'success': True,
            'message': 'Member added successfully'
        }, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error adding group member: {e}")
        return Response({
            'error': 'Failed to add member'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_group_member(request, group_id, user_id):
    try:
        group = Group.objects.get(id=group_id)
        
        # Check if user is admin
        user_membership = group.members.filter(user=request.user).first()
        if not user_membership or user_membership.role != 'admin':
            return Response({
                'error': 'Only group admins can remove members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member
        member = group.members.filter(user=user).first()
        if not member:
            return Response({
                'error': 'User is not a member of this group'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Don't allow removing the last admin
        if member.role == 'admin' and group.members.filter(role='admin').count() == 1:
            return Response({
                'error': 'Cannot remove the last admin from the group'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        member.delete()
        
        return Response({
            'success': True,
            'message': 'Member removed successfully'
        }, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error removing group member: {e}")
        return Response({
            'error': 'Failed to remove member'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_group_member(request, group_id, user_id):
    try:
        group = Group.objects.get(id=group_id)
        
        # Check if user is admin
        user_membership = group.members.filter(user=request.user).first()
        if not user_membership or user_membership.role != 'admin':
            return Response({
                'error': 'Only group admins can promote members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member
        member = group.members.filter(user=user).first()
        if not member:
            return Response({
                'error': 'User is not a member of this group'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if member.role == 'admin':
            return Response({
                'error': 'User is already an admin'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        member.role = 'admin'
        member.save()
        
        return Response({
            'success': True,
            'message': 'Member promoted to admin successfully'
        }, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error promoting group member: {e}")
        return Response({
            'error': 'Failed to promote member'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_messages(request, group_id):
    try:
        print(f"=== GET GROUP MESSAGES DEBUG ===")
        print(f"Request user: {request.user.username} (ID: {request.user.id})")
        print(f"Group ID: {group_id}")
        
        group = Group.objects.get(id=group_id)
        print(f"Group found: {group.name}")
        
        # Check if user is a member
        user_membership = group.members.filter(user=request.user).first()
        if not user_membership:
            print(f"User {request.user.username} is not a member of group {group.name}")
            return Response({
                'error': 'You are not a member of this group'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"User {request.user.username} is a member with role: {user_membership.role}")
        
        # Get messages with pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 50))
        
        messages = group.messages.all()
        total_messages = messages.count()
        
        print(f"Total messages in group: {total_messages}")
        
        # Calculate offset
        offset = (page - 1) * page_size
        messages = messages[offset:offset + page_size]
        
        serializer = GroupMessageSerializer(messages, many=True, context={'request': request})
        
        response_data = {
            'success': True,
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total_messages,
                'has_next': offset + page_size < total_messages,
                'has_previous': page > 1
            },
            'debug_info': {
                'user_role': user_membership.role,
                'group_name': group.name,
                'total_members': group.members.count()
            }
        }
        
        print(f"Response data: {response_data}")
        print(f"=== END DEBUG ===")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        print(f"Group with ID {group_id} not found")
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error getting group messages: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to get group messages'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_group_message(request, group_id):
    try:
        print(f"=== SEND GROUP MESSAGE DEBUG ===")
        print(f"Request user: {request.user.username} (ID: {request.user.id})")
        print(f"Group ID: {group_id}")
        print(f"Request data: {request.data}")
        print(f"Request files: {request.FILES}")
        
        group = Group.objects.get(id=group_id)
        print(f"Group found: {group.name}")
        
        # Check if user is a member
        user_membership = group.members.filter(user=request.user).first()
        if not user_membership:
            print(f"User {request.user.username} is not a member of group {group.name}")
            return Response({
                'error': 'You are not a member of this group'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"User {request.user.username} is a member with role: {user_membership.role}")
        
        message_text = request.data.get('message', '')
        attachment = request.FILES.get('attachment')
        
        print(f"Message text: {message_text}")
        print(f"Attachment: {attachment}")
        
        # Either message text or attachment is required
        if not message_text and not attachment:
            return Response({
                'error': 'Either message text or attachment is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create message
        message_data = {
            'group': group,
            'sender': request.user,
            'message': message_text
        }
        
        # Handle attachment if provided
        if attachment:
            message_data['attachment'] = attachment
        
        message = GroupMessage.objects.create(**message_data)
        print(f"Message created with ID: {message.id}")
        
        serializer = GroupMessageSerializer(message, context={'request': request})
        
        response_data = {
            'success': True,
            'message': 'Message sent successfully',
            'data': serializer.data,
            'debug_info': {
                'user_role': user_membership.role,
                'group_name': group.name,
                'total_members': group.members.count(),
                'message_id': message.id
            }
        }
        
        print(f"Response data: {response_data}")
        print(f"=== END DEBUG ===")
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Group.DoesNotExist:
        print(f"Group with ID {group_id} not found")
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error sending group message: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to send message'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_group(request, group_id):
    try:
        group = Group.objects.get(id=group_id)
        
        # Check if user is admin of the group
        member = group.members.filter(user=request.user).first()
        if not member or member.role != 'admin':
            return Response({
                'error': 'Only group admins can update groups'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Update group fields
        if 'name' in request.data:
            group.name = request.data['name']
        if 'description' in request.data:
            group.description = request.data['description']
        
        # Handle image update
        if 'image' in request.FILES:
            group.image = request.FILES['image']
        
        group.save()
        
        serializer = GroupSerializer(group, context={'request': request})
        return Response({
            'success': True,
            'message': 'Group updated successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error updating group: {e}")
        return Response({
            'error': 'Failed to update group'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_group(request, group_id):
    try:
        group = Group.objects.get(id=group_id)
        
        # Check if user is admin of the group
        member = group.members.filter(user=request.user).first()
        if not member or member.role != 'admin':
            return Response({
                'error': 'Only group admins can delete groups'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Delete the group (this will cascade delete members and messages)
        group.delete()
        
        return Response({
            'success': True,
            'message': 'Group deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except Group.DoesNotExist:
        return Response({
            'error': 'Group not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error deleting group: {e}")
        return Response({
            'error': 'Failed to delete group'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_resources(request, conversation_id):
    """Get all files/resources shared in a conversation"""
    try:
        # Check if user is part of the conversation
        conversation = Conversation.objects.get(id=conversation_id)
        if request.user not in conversation.participants.all():
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get messages with attachments
        messages = Message.objects.filter(
            conversation=conversation,
            attachment__isnull=False
        ).exclude(attachment='').order_by('-timestamp')
        
        # Serialize messages with attachment info
        resources = []
        for message in messages:
            if message.attachment:
                # Get file size if possible
                try:
                    file_size = message.attachment.size if hasattr(message.attachment, 'size') else None
                except:
                    file_size = None
                
                # Get file name from path
                file_name = message.attachment.name.split('/')[-1] if message.attachment.name else 'Unknown File'
                
                resources.append({
                    'id': message.id,
                    'file_name': file_name,
                    'file_url': request.build_absolute_uri(message.attachment.url),
                    'file_type': message.attachment_type or 'file',
                    'file_size': file_size,
                    'uploaded_by': message.sender.get_full_name() or message.sender.username,
                    'uploaded_at': message.timestamp,
                    'message_content': message.content,
                    'sender_id': message.sender.id,
                    'sender_username': message.sender.username,
                })
        
        # Get file type statistics
        file_types = {}
        for resource in resources:
            file_type = resource['file_type']
            if file_type not in file_types:
                file_types[file_type] = 0
            file_types[file_type] += 1
        
        return Response({
            'resources': resources,
            'total_files': len(resources),
            'file_types': file_types,
            'conversation_id': conversation_id
        }, status=status.HTTP_200_OK)
        
    except Conversation.DoesNotExist:
        return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in get_conversation_resources: {e}")
        return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_file_stats(request):
    """Get file upload statistics for the current user"""
    try:
        user = request.user
        
        # Get all messages with attachments by this user
        user_messages = Message.objects.filter(
            sender=user,
            attachment__isnull=False
        ).exclude(attachment='')
        
        # Calculate statistics
        total_files = user_messages.count()
        total_size = 0
        file_types = {}
        
        for message in user_messages:
            try:
                if hasattr(message.attachment, 'size'):
                    total_size += message.attachment.size
            except:
                pass
            
            file_type = message.attachment_type or 'file'
            if file_type not in file_types:
                file_types[file_type] = 0
            file_types[file_type] += 1
        
        # Get recent uploads
        recent_uploads = user_messages.order_by('-timestamp')[:10]
        recent_files = []
        
        for message in recent_uploads:
            file_name = message.attachment.name.split('/')[-1] if message.attachment.name else 'Unknown File'
            recent_files.append({
                'id': message.id,
                'file_name': file_name,
                'file_type': message.attachment_type or 'file',
                'uploaded_at': message.timestamp,
                'conversation_id': message.conversation.id
            })
        
        return Response({
            'total_files': total_files,
            'total_size': total_size,
            'file_types': file_types,
            'recent_uploads': recent_files
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_user_file_stats: {e}")
        return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_message_attachment(request, message_id):
    """Download a message attachment securely"""
    try:
        # Get the message
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is part of the conversation
        if not message.conversation.participants.filter(id=request.user.id).exists():
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if message has attachment
        if not message.attachment:
            return Response({"error": "No attachment found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get file path
        file_path = message.attachment.path
        
        # Check if file exists
        if not os.path.exists(file_path):
            return Response({"error": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get file info
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        # Create response with file
        with open(file_path, 'rb') as file:
            response = HttpResponse(file.read(), content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{file_name}"'
            response['Content-Length'] = file_size
            return response
            
    except Exception as e:
        print(f"Error in download_message_attachment: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_resources(request, conversation_id):
    """Get all resources (attachments) from a conversation"""
    try:
        user = request.user
        
        # Get conversation and check access
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if not conversation.participants.filter(id=user.id).exists():
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get messages with attachments
        messages_with_attachments = conversation.messages.filter(
            attachment__isnull=False
        ).exclude(attachment='').order_by('-timestamp')
        
        resources = []
        for message in messages_with_attachments:
            if message.attachment:
                resources.append({
                    'id': message.id,
                    'file_name': os.path.basename(message.attachment.name),
                    'file_size': message.attachment.size if hasattr(message.attachment, 'size') else 0,
                    'file_type': message.attachment_type,
                    'uploaded_by': message.sender.username,
                    'uploaded_at': message.timestamp.isoformat(),
                    'download_url': f'/api/messages/{message.id}/download/'
                })
        
        return Response({
            'resources': resources,
            'total_count': len(resources)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_conversation_resources: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """Delete a message (only by sender)"""
    try:
        # Get the message
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is the sender of the message
        if message.sender != request.user:
            return Response({"error": "You can only delete your own messages"}, status=status.HTTP_403_FORBIDDEN)
        
        # Delete the message
        message.delete()
        
        return Response({"message": "Message deleted successfully"}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in delete_message: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
