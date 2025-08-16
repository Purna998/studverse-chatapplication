from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Real-time messaging connection (for individual messages) - PRIMARY
    re_path(r'ws/chat/$', consumers.ApiConsumer.as_asgi()),
    # Room-based chat (for specific conversations)
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
    # Group chat
    re_path(r'ws/group/(?P<group_id>\d+)/$', consumers.GroupChatConsumer.as_asgi()),
]