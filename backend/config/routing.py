"""
Routing WebSocket pour Django Channels.

Configure le routing des WebSockets avec authentification JWT.
"""

from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from message.consumers import ChatConsumer


# Routes WebSocket
websocket_urlpatterns = [
    path('ws/chat/', ChatConsumer.as_asgi()),
]


# Configuration du protocole router
application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
