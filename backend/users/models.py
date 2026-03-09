from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.models import User

class User(AbstractUser):
    ROLE_CHOICES = (
        ('farmer', 'Farmer'),
        ('consumer', 'Consumer'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='consumer')

class Address(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    address = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.address[:30]}"