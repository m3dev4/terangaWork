"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Configuration de Django avant d'importer Channels
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django_asgi_app = get_asgi_application()

# Importations Channels après l'initialisation de Django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from message.consumers import ChatConsumer
from django.urls import path

# Routes WebSocket
websocket_urlpatterns = [
    path('ws/chat/', ChatConsumer.as_asgi()),
]

# Application ASGI combinant HTTP (Django) et WebSocket (Channels)
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
