from rest_framework import serializers
from .models import User
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=['farmer', 'consumer', 'admin'], required=False, default='consumer')
    
    class Meta:
        model = get_user_model()
        fields = ['username', 'email', 'password', 'role']

    def create(self, validated_data):
        user = get_user_model().objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'consumer')
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Allow authentication with either username or email."""

    def validate(self, attrs):
        # The incoming payload may use 'username' field which could be an email.
        username = attrs.get('username') or attrs.get('email')
        password = attrs.get('password')

        # Try authenticating directly first
        user = authenticate(username=username, password=password)

        # If direct auth failed and username looks like an email, try lookup by email
        if user is None and username and '@' in username:
            try:
                user_obj = get_user_model().objects.get(email__iexact=username)
                user = authenticate(username=user_obj.username, password=password)
            except get_user_model().DoesNotExist:
                user = None

        if user is None:
            raise serializers.ValidationError('No active account found with the given credentials')

        # If authentication succeeded, set attrs so parent class can create tokens
        attrs['username'] = user.username
        return super().validate(attrs)
    

