from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ("farmer", "Farmer"),
        ("consumer", "Consumer"),
        ("admin", "Admin"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="consumer")
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
