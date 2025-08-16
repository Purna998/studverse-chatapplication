import os
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User

User = get_user_model()

class GoogleOAuth:
    def __init__(self):
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    def verify_google_token(self, token):
        """
        Verify the Google ID token and return user info
        """
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                self.client_id
            )
            
            # Get user info from the token
            user_info = {
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'given_name': idinfo.get('given_name', ''),
                'family_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', ''),
                'sub': idinfo['sub']  # Google's unique user ID
            }
            
            return user_info
        except Exception as e:
            print(f"Error verifying Google token: {e}")
            return None
    
    def get_or_create_user(self, user_info):
        """
        Get or create a user based on Google user info
        """
        try:
            # Try to find user by Google ID first
            user = User.objects.filter(google_id=user_info['sub']).first()
            
            if not user:
                # Try to find user by email
                user = User.objects.filter(email=user_info['email']).first()
                
                if user:
                    # Update existing user with Google ID
                    user.google_id = user_info['sub']
                    user.save()
                else:
                    # Create new user
                    username = self._generate_username(user_info['email'])
                    user = User.objects.create(
                        username=username,
                        email=user_info['email'],
                        full_name=user_info['name'],
                        profile_picture=user_info['picture'],
                        google_id=user_info['sub'],
                        is_google_user=True
                    )
            
            # Update user info if needed
            if user.full_name != user_info['name'] or user.profile_picture != user_info['picture']:
                user.full_name = user_info['name']
                user.profile_picture = user_info['picture']
                user.save()
            
            return user
        except Exception as e:
            print(f"Error creating/getting user: {e}")
            return None
    
    def _generate_username(self, email):
        """
        Generate a unique username from email
        """
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        return username
    
    def create_tokens(self, user):
        """
        Create JWT tokens for the user
        """
        try:
            refresh = RefreshToken.for_user(user)
            return {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.full_name,
                    'profile_picture': user.profile_picture,
                    'is_admin': user.is_admin,
                    'is_google_user': user.is_google_user
                }
            }
        except Exception as e:
            print(f"Error creating tokens: {e}")
            return None 