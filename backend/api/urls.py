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
    test_auth_simple,  # Add this import
    get_colleges,  # Add this import
    get_forums,  # Public forums list
    create_forum,
    create_forum_channel,
    list_forum_channels,
    forum_channel_messages,
    generate_forum_invitation,
    join_forum_via_invitation,
    
    google_auth,  # Add Google OAuth import
    
    # Admin views
    admin_get_users,
    admin_delete_user,
    admin_get_messages,
    admin_delete_all_messages,
    admin_get_groups,
    admin_get_forums,
    admin_add_college,
    admin_add_group,
    admin_add_forum,
    admin_delete_college,
    admin_delete_group,
    admin_delete_forum,
    
    # New dynamic chat system views
    get_user_conversations,
    search_user_by_email,
    get_conversation_messages,
    send_message_new,
    mark_conversation_read,
    get_tab_sessions,
    
    # File and resource sharing views
    download_message_attachment,
    get_conversation_resources,
    
    # Message management views
    delete_message,
    
    # Nearby users views
    get_nearby_users,
    
    # Group views
    create_group,
    get_user_groups,
    get_group_details,
    get_group_members,
    add_group_member,
    remove_group_member,
    promote_group_member,
    get_group_messages,
    send_group_message,
    delete_group,
    update_group,
    
    # Resource management views
    get_conversation_resources,
    get_user_file_stats,
)

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="get_token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/checktoken/", check_token, name="check_token"),
    
    # Google OAuth endpoint
    path("auth/google/", google_auth, name="google_auth"),
    
    path("get_conversation/<str:sender>/<str:receiver>/", get_conversation, name="get_convo"),
    path("get__last_convo/<str:sender>/<str:receiver>/", get__last_convo, name="get_lconvo"),
    path('users/', list_users, name='list_users'),
    path("send_message/", send_message, name="send_message"),  # Add this
    
    # Colleges endpoint
    path("colleges/", get_colleges, name="get_colleges"),
    # Public forums
    path("forums/", get_forums, name="get_forums"),
    path("forums/create/", create_forum, name="create_forum"),
    path("forums/<int:forum_id>/channels/", list_forum_channels, name="list_forum_channels"),
    path("forums/<int:forum_id>/invitation/", generate_forum_invitation, name="generate_forum_invitation"),
    path("forums/<int:forum_id>/join/", join_forum_via_invitation, name="join_forum_via_invitation"),
    path("forums/<int:forum_id>/channels/create/", create_forum_channel, name="create_forum_channel"),
    path("channels/<int:channel_id>/messages/", forum_channel_messages, name="forum_channel_messages"),
    
    # Admin endpoints
    path("admin/users/", admin_get_users, name="admin_get_users"),
    path("admin/users/<int:user_id>/delete/", admin_delete_user, name="admin_delete_user"),
    path("admin/messages/", admin_get_messages, name="admin_get_messages"),
    path("admin/messages/delete-all/", admin_delete_all_messages, name="admin_delete_all_messages"),
    path("admin/groups/", admin_get_groups, name="admin_get_groups"),
    path("admin/forums/", admin_get_forums, name="admin_get_forums"),
    path("admin/colleges/add/", admin_add_college, name="admin_add_college"),
    path("admin/groups/add/", admin_add_group, name="admin_add_group"),
    path("admin/forums/add/", admin_add_forum, name="admin_add_forum"),
    path("admin/colleges/<int:college_id>/delete/", admin_delete_college, name="admin_delete_college"),
    path("admin/groups/<int:group_id>/delete/", admin_delete_group, name="admin_delete_group"),
    path("admin/forums/<int:forum_id>/delete/", admin_delete_forum, name="admin_delete_forum"),
    
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
    path("test-auth/", test_auth_simple, name="test_auth_simple"),
    
    #Search users
    path("users/search/", search_users, name="search_users"),
    
    # Location endpoints
    path("user/location/", update_user_location, name="update_user_location"),
    path("users/locations/", get_user_locations, name="get_user_locations"),
    path("nearby/users/", get_nearby_users, name="get_nearby_users"),
    
    # New dynamic chat system endpoints
    path("conversations/", get_user_conversations, name="get_user_conversations"),
    path("search_user_by_email/", search_user_by_email, name="search_user_by_email"),
    path("conversations/<int:conversation_id>/messages/", get_conversation_messages, name="get_conversation_messages"),
    path("send_message_new/", send_message_new, name="send_message_new"),
    path("conversations/<int:conversation_id>/mark_read/", mark_conversation_read, name="mark_conversation_read"),
    path("tab_sessions/", get_tab_sessions, name="get_tab_sessions"),
    
    # File and resource sharing endpoints
    path("messages/<int:message_id>/download/", download_message_attachment, name="download_message_attachment"),
    path("conversations/<int:conversation_id>/resources/", get_conversation_resources, name="get_conversation_resources"),
    
    # Message management endpoints
    path("messages/<int:message_id>/delete/", delete_message, name="delete_message"),
    
    # Group endpoints
    path("groups/create/", create_group, name="create_group"),
    path("groups/", get_user_groups, name="get_user_groups"),
    path("groups/<int:group_id>/", get_group_details, name="get_group_details"),
    path("groups/<int:group_id>/update/", update_group, name="update_group"),
    path("groups/<int:group_id>/delete/", delete_group, name="delete_group"),
    path("groups/<int:group_id>/members/", get_group_members, name="get_group_members"),
    path("groups/<int:group_id>/members/add/", add_group_member, name="add_group_member"),
    path("groups/<int:group_id>/members/<int:user_id>/remove/", remove_group_member, name="remove_group_member"),
    path("groups/<int:group_id>/members/<int:user_id>/promote/", promote_group_member, name="promote_group_member"),
    path("groups/<int:group_id>/messages/", get_group_messages, name="get_group_messages"),
    path("groups/<int:group_id>/messages/send/", send_group_message, name="send_group_message"),
    
    # Resource and file management endpoints
    path("user/file-stats/", get_user_file_stats, name="get_user_file_stats"),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)