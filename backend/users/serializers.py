from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate

from .address_utils import normalize_address_text
from .models import Address


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=["farmer", "consumer", "admin"], required=False, default="consumer")

    class Meta:
        model = get_user_model()
        fields = ["username", "email", "password", "role"]

    def create(self, validated_data):
        return get_user_model().objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data.get("role", "consumer"),
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get("username") or attrs.get("email")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)
        if user is None and username and "@" in username:
            try:
                user_obj = get_user_model().objects.get(email__iexact=username)
                user = authenticate(username=user_obj.username, password=password)
            except get_user_model().DoesNotExist:
                user = None

        if user is None:
            raise serializers.ValidationError("No active account found with the given credentials")

        attrs["username"] = user.username
        return super().validate(attrs)


class AddressSerializer(serializers.ModelSerializer):
    cleaned_preview = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Address
        fields = [
            "id",
            "user",
            "label",
            "address",
            "normalized_address",
            "phone_number",
            "latitude",
            "longitude",
            "cleaned_preview",
            "created_at",
        ]
        read_only_fields = ["user", "normalized_address", "phone_number", "cleaned_preview", "created_at"]

    def get_cleaned_preview(self, obj):
        return obj.normalized_address or obj.address

    def create(self, validated_data):
        cleaned = normalize_address_text(validated_data.get("address", ""))
        validated_data["normalized_address"] = cleaned["normalized"]
        validated_data["phone_number"] = cleaned["phone_number"]
        if not validated_data.get("label"):
            validated_data["label"] = cleaned["label"] or "Delivery Address"
        return super().create(validated_data)
