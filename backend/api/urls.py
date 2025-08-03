# Updated urls.py
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    CustomTokenObtainPairView, 
    CreateUserView, 
    check_token, 
    get_conversation, 
    get__last_convo,
    list_users,
    get_user_profile,  # Add this import
    send_message,  # Add this import
    profile_update,
    upload_profile_picture,
    delete_profile_picture,
    list_profile_pictures,
    test_upload_endpoint,
    debug_all_requests,
    search_users,
    update_user_location,
    get_user_locations,
    debug_auth,  # Add this import
    get_colleges,  # Add this import
    
    # Admin views
    admin_get_users,
    admin_get_messages,
    admin_get_groups,
    admin_get_forums,
    admin_add_college,
    admin_add_group,
    admin_add_forum,
    
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="get_token"),
    path("token/checktoken/", check_token, name="check_token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("get_conversation/<str:sender>/<str:receiver>/", get_conversation, name="get_convo"),
    path("get__last_convo/<str:sender>/<str:receiver>/", get__last_convo, name="get_lconvo"),
    path('users/', list_users, name='list_users'),
    path("send_message/", send_message, name="send_message"),  # Add this
    
    # Colleges endpoint
    path("colleges/", get_colleges, name="get_colleges"),
    
    # Admin endpoints
    path("admin/users/", admin_get_users, name="admin_get_users"),
    path("admin/messages/", admin_get_messages, name="admin_get_messages"),
    path("admin/groups/", admin_get_groups, name="admin_get_groups"),
    path("admin/forums/", admin_get_forums, name="admin_get_forums"),
    path("admin/colleges/add/", admin_add_college, name="admin_add_college"),
    path("admin/groups/add/", admin_add_group, name="admin_add_group"),
    path("admin/forums/add/", admin_add_forum, name="admin_add_forum"),
    
    # Test endpoint
    path("test-upload/", test_upload_endpoint, name="test_upload_endpoint"),
    
    # Profile management endpoints - ORDER MATTERS! More specific patterns first
    path("user/profile/upload-picture/", upload_profile_picture, name="upload_profile_picture"),
    path("user/profile/delete-picture/", delete_profile_picture, name="delete_profile_picture"),
    path("user/profile/list-pictures/", list_profile_pictures, name="list_profile_pictures"),
    path("user/profile/", profile_update, name="profile_update"),
    path("user/profile/<str:username>/", get_user_profile, name="get_user_profile"),
    
    # Debug endpoint - catch all unmatched requests
    path("debug/", debug_all_requests, name="debug_all_requests"),
    
    # Debug auth endpoint
    path("debug-auth/", debug_auth, name="debug_auth"),
    
    #Search users
    path("users/search/", search_users, name="search_users"),
    
    # Location endpoints
    path("user/location/", update_user_location, name="update_user_location"),
    path("users/locations/", get_user_locations, name="get_user_locations"),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)