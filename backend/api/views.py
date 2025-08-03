from django.shortcuts import render
from django.contrib.auth.models import User
from .serializers import UserSerializer, ProfileUpdateSerializer, CollegeSerializer, GroupSerializer, ForumSerializer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, TokenError, AccessToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ChatConvo, UserProfile, UserLocation, College, Group, Forum
from django.db.models import Q
from django.http import HttpResponse
import os
import time
from django.conf import settings
from .utils import get_profile_picture_url, save_profile_picture_file, delete_profile_picture_file

# Updated views.py functions to support full names


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


# Admin Views

# Get all users (admin only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_users(request):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
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
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        messages = ChatConvo.objects.all().order_by('-timestamp')
        message_data = []
        for message in messages:
            message_data.append({
                'id': message.id,
                'sender': message.sender.username,
                'receiver': message.receiver.username,
                'message': message.message,
                'timestamp': message.timestamp
            })
        
        return Response({
            'data': message_data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in admin_get_messages: {e}")
        return Response(data={"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Get all groups (admin only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_groups(request):
    try:
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        groups = Group.objects.all().order_by('-created_at')
        serializer = GroupSerializer(groups, many=True)
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
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        forums = Forum.objects.all().order_by('-created_at')
        serializer = ForumSerializer(forums, many=True)
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
        # Check if user is admin
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_admin:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CollegeSerializer(data=request.data)
        if serializer.is_valid():
            college = serializer.save()
            return Response({
                'message': 'College added successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in admin_add_college: {e}")
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


# Updated CreateUserView to handle first_name and last_name
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Handle college_name if provided
            college_name = request.data.get('college_name')
            if college_name:
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.college_name = college_name
                profile.save()
            
            return Response({
                'message': 'User created successfully',
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip() if user.first_name or user.last_name else user.username,
                'college_name': college_name
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        
        # Delete old profile picture if it exists
        if profile.profile_picture:
            delete_profile_picture_file(profile.profile_picture)
        
        # Save new file using utility function
        relative_path, file_path = save_profile_picture_file(uploaded_file, request.user.username)
        print(f"File saved to: {file_path}")
        
        # Try to save to database
        try:
            profile.profile_picture = relative_path
            profile.save()
            print(f"Profile picture saved to database: {profile.profile_picture}")
        except Exception as db_error:
            print(f"Database save failed: {db_error}")
            # Continue with file-based storage
        
        # Get the full URL for response
        file_url = get_profile_picture_url(request, relative_path)
        
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
        }
        
        return Response({
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
    
    # Exclude the current user and admin user
    users = User.objects.exclude(id=request.user.id).exclude(username='admin')
    data = []
    
    for u in users:
        # Get profile picture URL using utility function
        profile_picture_url = get_profile_picture_url(request, u.profile.profile_picture if hasattr(u, 'profile') else None)
        
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
    
    return Response(data)

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
        # Case-insensitive prefix search on username, first_name, last_name, or email
        users = User.objects.filter(
            Q(username__istartswith=prefix) |
            Q(first_name__istartswith=prefix) |
            Q(last_name__istartswith=prefix) |
            Q(email__istartswith=prefix)
        ).exclude(id=request.user.id)  # Exclude current user from search results
        
        # Limit results to prevent performance issues
        users = users[:50]
        
        # Prepare response data with profile information
        data = []
        for user in users:
            try:
                profile = user.profile
                profile_picture_url = get_profile_picture_url(request, profile.profile_picture) if profile.profile_picture else None
            except UserProfile.DoesNotExist:
                profile_picture_url = None
            
            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "full_name": user.get_full_name() if user.get_full_name() else user.username,
                "profile_picture": profile_picture_url,
                "description": profile.description if hasattr(user, 'profile') and user.profile else None,
                "college_name": profile.college_name if hasattr(user, 'profile') and user.profile else None,
            }
            data.append(user_data)
        
        print(f"DEBUG: search_users returning {len(data)} users")
        return Response(data, status=200)
        
    except Exception as e:
        print(f"ERROR: search_users exception: {e}")
        return Response({"error": "Internal server error"}, status=500)


# Location management endpoints
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_user_location(request):
    try:
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        timestamp = request.data.get('timestamp')
        
        if not latitude or not longitude:
            return Response({"error": "Latitude and longitude are required"}, status=400)
        
        # Create new location entry
        location = UserLocation.objects.create(
            user=request.user,
            latitude=latitude,
            longitude=longitude,
            is_online=True
        )
        
        # Update user's last_seen
        request.user.profile.save()
        
        return Response({
            "message": "Location updated successfully",
            "location": {
                "latitude": float(location.latitude),
                "longitude": float(location.longitude),
                "timestamp": location.timestamp.isoformat()
            }
        }, status=200)
        
    except Exception as e:
        print(f"ERROR: update_user_location exception: {e}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_locations(request):
    try:
        # Get all users' latest locations
        locations = []
        users = User.objects.exclude(id=request.user.id)
        
        for user in users:
            latest_location = UserLocation.objects.filter(user=user).first()
            if latest_location:
                locations.append({
                    "user_id": user.id,
                    "username": user.username,
                    "latitude": float(latest_location.latitude),
                    "longitude": float(latest_location.longitude),
                    "timestamp": latest_location.timestamp.isoformat(),
                    "is_online": latest_location.is_online,
                    "last_seen": latest_location.last_seen.isoformat()
                })
        
        return Response(locations, status=200)
        
    except Exception as e:
        print(f"ERROR: get_user_locations exception: {e}")
        return Response({"error": "Internal server error"}, status=500)

# Debug endpoint to check authentication
@api_view(['GET'])
def debug_auth(request):
    """Debug endpoint to check authentication status"""
    print(f"\n==== DEBUG AUTH ENDPOINT ====")
    print(f"Request method: {request.method}")
    print(f"Request path: {request.path}")
    print(f"Request headers: {dict(request.headers)}")
    print(f"Authorization header: {request.headers.get('Authorization')}")
    print(f"Request user: {request.user}")
    print(f"User is authenticated: {request.user.is_authenticated}")
    print(f"Request auth: {request.auth}")
    print(f"==== END DEBUG ====\n")
    
    return Response({
        "message": "Debug auth endpoint",
        "user": str(request.user),
        "is_authenticated": request.user.is_authenticated,
        "auth_header": request.headers.get('Authorization'),
        "all_headers": dict(request.headers)
    }, status=status.HTTP_200_OK)
