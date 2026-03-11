from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.backends import TokenBackend
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .address_utils import normalize_address_text
from .map_service import reverse_geocode_location, search_map_locations
from .models import Address
from .serializers import AddressSerializer, CustomTokenObtainPairSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def simple_login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"detail": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if user is None and "@" in username:
        try:
            user_model = get_user_model()
            found_user = user_model.objects.get(email__iexact=username)
            user = authenticate(username=found_user.username, password=password)
        except Exception:
            user = None

    if user is None:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh), "role": user.role})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user

    if request.method == "GET":
        return Response(
            {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": getattr(user, "role", None),
                "warehouse_name": getattr(user, "warehouse_name", ""),
                "dispatch_location": getattr(user, "dispatch_location", ""),
                "dispatch_latitude": getattr(user, "dispatch_latitude", None),
                "dispatch_longitude": getattr(user, "dispatch_longitude", None),
                "date_joined": user.date_joined,
            }
        )

    if request.data.get("email"):
        user.email = request.data.get("email")
    if request.data.get("first_name") is not None:
        user.first_name = request.data.get("first_name")
    if request.data.get("last_name") is not None:
        user.last_name = request.data.get("last_name")
    if request.data.get("warehouse_name") is not None:
        user.warehouse_name = request.data.get("warehouse_name").strip()
    if request.data.get("dispatch_location") is not None:
        cleaned_dispatch = normalize_address_text(request.data.get("dispatch_location"))
        user.dispatch_location = cleaned_dispatch["normalized"] or request.data.get("dispatch_location").strip()
        user.dispatch_latitude = request.data.get("dispatch_latitude") or None
        user.dispatch_longitude = request.data.get("dispatch_longitude") or None

    user.save()

    return Response(
        {
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": getattr(user, "role", None),
            "warehouse_name": getattr(user, "warehouse_name", ""),
            "dispatch_location": getattr(user, "dispatch_location", ""),
            "dispatch_latitude": getattr(user, "dispatch_latitude", None),
            "dispatch_longitude": getattr(user, "dispatch_longitude", None),
            "date_joined": user.date_joined,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def validate_token(request):
    token = None
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
    if not token:
        token = request.data.get("access") or request.data.get("token") or request.query_params.get("access") or request.COOKIES.get("access")
    if not token:
        return Response({"detail": "No token provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        backend = TokenBackend(algorithm="HS256")
        decoded = backend.decode(token, verify=False)
        return Response({"valid": True, "payload": decoded})
    except Exception as exc:
        return Response({"valid": False, "error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def addresses(request):
    if request.method == "GET":
        serializer = AddressSerializer(Address.objects.filter(user=request.user).order_by("-created_at"), many=True)
        return Response(serializer.data)

    serializer = AddressSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def map_search(request):
    query = request.query_params.get("q", "")
    if not query.strip():
        return Response({"results": []})
    try:
        return Response({"results": search_map_locations(query)})
    except Exception as exc:
        return Response({"detail": f"Map search failed: {exc}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def map_reverse(request):
    latitude = request.query_params.get("lat")
    longitude = request.query_params.get("lon")
    if latitude is None or longitude is None:
        return Response({"detail": "lat and lon are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        return Response(reverse_geocode_location(latitude, longitude))
    except Exception:
        return Response(
            {
                "display_name": f"Pinned location ({float(latitude):.5f}, {float(longitude):.5f})",
                "latitude": float(latitude),
                "longitude": float(longitude),
                "components": {
                    "house_number": "",
                    "road": "",
                    "suburb": "",
                    "city": "",
                    "state": "",
                    "postcode": "",
                    "country": "India",
                },
                "fallback": True,
            }
        )
