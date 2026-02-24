from rest_framework import serializers
from .models import User
from django.contrib.auth import get_user_model

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