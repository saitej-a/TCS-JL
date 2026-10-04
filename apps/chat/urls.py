"""URL routing for chat app (Phase 13 D-03)."""

from django.urls import path

from apps.chat.views import (
    ChatMessageDeleteView,
    ChatMessageListCreateView,
    ChatRoomListView,
    WsTicketView,
)

app_name = "chat"

urlpatterns = [
    path("rooms/", ChatRoomListView.as_view(), name="room-list"),
    path("rooms/<slug:slug>/messages/", ChatMessageListCreateView.as_view(), name="message-list-create"),
    path("messages/<uuid:pk>/delete/", ChatMessageDeleteView.as_view(), name="message-delete"),
    path("ws-ticket/", WsTicketView.as_view(), name="ws-ticket"),
]
