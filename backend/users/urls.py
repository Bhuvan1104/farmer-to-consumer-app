from django.urls import path

from .views import (
    RegisterView,
    addresses,
    chat_contacts,
    chat_message_delete,
    chat_message_detail,
    chat_message_edit,
    chat_messages,
    map_reverse,
    map_search,
    profile_view,
    validate_token,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', profile_view, name='profile'),
    path('validate-token/', validate_token, name='validate-token'),
    path('addresses/', addresses, name='addresses'),
    path('chat/contacts/', chat_contacts, name='chat-contacts'),
    path('chat/messages/', chat_messages, name='chat-messages'),
    path('chat/messages/<int:message_id>/', chat_message_detail, name='chat-message-detail'),
    path('chat/messages/<int:message_id>/delete/', chat_message_delete, name='chat-message-delete'),
    path('chat/messages/<int:message_id>/edit/', chat_message_edit, name='chat-message-edit'),
    path('map-search/', map_search, name='map-search'),
    path('map-reverse/', map_reverse, name='map-reverse'),
]
