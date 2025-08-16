import os
import time
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import TabSession

def get_profile_picture_url(request, profile_picture_field):
    """
    Get the full URL for a profile picture, handling both database and file-based storage
    """
    if not profile_picture_field:
        return None
    
    try:
        # Try database URL first
        return f"{request.build_absolute_uri('/')[:-1]}{profile_picture_field.url}"
    except:
        # Fallback to file-based URL
        return f"{request.build_absolute_uri('/')[:-1]}{settings.MEDIA_URL}{profile_picture_field}"

def save_profile_picture_file(uploaded_file, username):
    """
    Save a profile picture file to the local directory
    """
    # Create a unique filename
    file_extension = os.path.splitext(uploaded_file.name)[1]
    unique_filename = f"profile_{username}_{int(time.time())}{file_extension}"
    
    # Ensure the upload directory exists
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'profile_pictures')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file to local directory
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    
    return f'profile_pictures/{unique_filename}', file_path

def delete_profile_picture_file(profile_picture_field):
    """
    Delete a profile picture file from the local directory
    """
    if not profile_picture_field:
        return False

# Tab Session Management Functions
def get_or_create_tab_session(user, tab_id, session_key, user_agent=None):
    """
    Get or create a tab session for a user
    """
    try:
        # Try to get existing session
        session = TabSession.objects.get(tab_id=tab_id)
        
        # Update activity and user agent
        session.last_activity = timezone.now()
        if user_agent:
            session.user_agent = user_agent
        session.save()
        
        return session
    except TabSession.DoesNotExist:
        # Create new session
        session = TabSession.objects.create(
            user=user,
            tab_id=tab_id,
            session_key=session_key,
            user_agent=user_agent
        )
        return session

def cleanup_inactive_sessions():
    """
    Clean up sessions that haven't been active for more than 2 hours
    """
    cutoff_time = timezone.now() - timedelta(hours=2)
    TabSession.objects.filter(
        last_activity__lt=cutoff_time,
        is_active=True
    ).update(is_active=False)

def get_user_active_sessions(user):
    """
    Get all active sessions for a user
    """
    cleanup_inactive_sessions()  # Clean up old sessions first
    return TabSession.objects.filter(user=user, is_active=True)

def validate_tab_session(user, tab_id, session_key):
    """
    Validate if a tab session is valid for the user
    """
    try:
        session = TabSession.objects.get(
            tab_id=tab_id,
            user=user,
            is_active=True
        )
        
        # Update activity
        session.update_activity()
        return True
    except TabSession.DoesNotExist:
        return False
    
    try:
        # Try database path first
        file_path = profile_picture_field.path
        if os.path.isfile(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"Error deleting file (database path): {e}")
        
        # Try alternative path
        try:
            alt_path = os.path.join(settings.MEDIA_ROOT, str(profile_picture_field))
            if os.path.isfile(alt_path):
                os.remove(alt_path)
                return True
        except Exception as e2:
            print(f"Error deleting file (alt path): {e2}")
    
    return False 