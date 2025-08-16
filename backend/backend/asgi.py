"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import api.routing  

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Optimized ASGI application for ultra-fast messaging
application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': URLRouter(
        api.routing.websocket_urlpatterns
    )
})