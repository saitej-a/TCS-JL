"""WebSocket routing for chat domain (Phase 13 D-04)."""

from django.urls import re_path

from apps.chat.consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r"^ws/chat/(?P<room_slug>[-\w]+)/$", ChatConsumer.as_asgi()),
]
