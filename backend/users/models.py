from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ("farmer", "Farmer"),
        ("consumer", "Consumer"),
        ("admin", "Admin"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="consumer")
    preferred_language = models.CharField(
        max_length=8,
        choices=(("en", "English"), ("hi", "Hindi"), ("te", "Telugu"), ("ta", "Tamil")),
        default="en",
    )
    warehouse_name = models.CharField(max_length=200, blank=True, default="")
    dispatch_location = models.TextField(blank=True, default="")
    dispatch_latitude = models.FloatField(blank=True, null=True)
    dispatch_longitude = models.FloatField(blank=True, null=True)


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    label = models.CharField(max_length=120, blank=True, default="")
    address = models.TextField()
    normalized_address = models.TextField(blank=True, default="")
    phone_number = models.CharField(max_length=30, blank=True, default="")
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        label = self.label or self.user.username
        return f"{label} - {self.address[:30]}"


class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    source_text = models.TextField()
    source_language = models.CharField(max_length=8, default="en")
    translated_text = models.TextField(blank=True, default="")
    translated_language = models.CharField(max_length=8, default="en")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.created_at:%Y-%m-%d %H:%M})"
