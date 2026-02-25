from rest_framework import generics, permissions
from .serializers import RegisterSerializer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from rest_framework.decorators import authentication_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.backends import TokenBackend
import json

class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def simple_login(request):
    """Fallback login: authenticate and return a simple HS256 JWT access token."""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'detail': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

    # Try authenticating with username first
    user = authenticate(username=username, password=password)

    # If failed and looks like email, try email lookup
    if user is None and '@' in username:
        try:
            from django.contrib.auth import get_user_model
            user_model = get_user_model()
            u = user_model.objects.get(email__iexact=username)
            user = authenticate(username=u.username, password=password)
        except Exception:
            user = None

    if user is None:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    # Issue SimpleJWT refresh and access tokens for compatibility
    refresh = RefreshToken.for_user(user)
    return Response({
    "access": str(refresh.access_token),
    "refresh": str(refresh),
    "role": user.role
})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Get or update current user's profile."""
    user = request.user

    if request.method == 'GET':
        data = {
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': getattr(user, 'role', None),
            'date_joined': user.date_joined,
        }
        return Response(data)

    # PUT - update profile
    if request.method == 'PUT':
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')

        if email:
            user.email = email
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name

        user.save()
        data = {
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': getattr(user, 'role', None),
            'date_joined': user.date_joined,
        }
        return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_token(request):
    """Debug endpoint: validate a token supplied in Authorization header or body.

    Returns decoded token payload or an error message to help diagnose
    'token_not_valid' cases during development.
    """
    token = None
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Bearer '):
        token = auth.split(' ', 1)[1]

    if not token:
        # try body/query/cookies
        token = request.data.get('access') or request.data.get('token') or request.query_params.get('access') or request.COOKIES.get('access')

    if not token:
        return Response({'detail': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        backend = TokenBackend(algorithm='HS256')
        decoded = backend.decode(token, verify=False)
        return Response({'valid': True, 'payload': decoded})
    except Exception as e:
        # Try to provide clearer detail
        msg = str(e)
        return Response({'valid': False, 'error': msg}, status=status.HTTP_400_BAD_REQUEST)