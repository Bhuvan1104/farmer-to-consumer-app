from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import Address, ChatMessage

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "role", "preferred_language")
    search_fields = ("username", "email")
    list_filter = ("role", "preferred_language")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "label", "phone_number", "created_at")
    search_fields = ("user__username", "label", "address")
    list_filter = ("created_at",)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "source_language", "translated_language", "is_read", "created_at")
    search_fields = ("sender__username", "receiver__username", "source_text", "translated_text")
    list_filter = ("source_language", "translated_language", "is_read", "created_at")
