from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.backends import TokenBackend
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .address_utils import normalize_address_text
from .map_service import reverse_geocode_location, search_map_locations
from .models import Address, ChatMessage
from .serializers import (
    AddressSerializer,
    ChatContactSerializer,
    ChatMessageSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
)
from .translation_service import MessageTranslator, normalize_lang


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
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": getattr(user, "role", None),
                "preferred_language": getattr(user, "preferred_language", "en"),
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
    if request.data.get("preferred_language") is not None:
        user.preferred_language = normalize_lang(request.data.get("preferred_language"))
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
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": getattr(user, "role", None),
            "preferred_language": getattr(user, "preferred_language", "en"),
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_contacts(request):
    user = request.user
    user_model = get_user_model()

    if user.role == "consumer":
        qs = user_model.objects.filter(
            role="farmer",
            id__in=user.consumer_orders.values_list("product__farmer_id", flat=True),
        ).distinct()
    elif user.role == "farmer":
        qs = user_model.objects.filter(
            role="consumer",
            id__in=user_model.objects.filter(
                consumer_orders__product__farmer=user
            ).values_list("id", flat=True),
        ).distinct()
    else:
        qs = user_model.objects.none()

    contacts_payload = []
    for contact in qs:
        last_msg = (
            ChatMessage.objects.filter(
                Q(sender=user, receiver=contact) | Q(sender=contact, receiver=user)
            )
            .order_by("-created_at")
            .first()
        )
        unread = ChatMessage.objects.filter(sender=contact, receiver=user, is_read=False).count()
        contacts_payload.append(
            {
                "id": contact.id,
                "username": contact.username,
                "role": contact.role,
                "preferred_language": getattr(contact, "preferred_language", "en"),
                "last_message": (last_msg.source_text if last_msg else ""),
                "last_message_at": (last_msg.created_at if last_msg else None),
                "unread_count": unread,
            }
        )

    contacts_payload.sort(
        key=lambda item: (item["last_message_at"] is not None, item["last_message_at"]),
        reverse=True,
    )
    serializer = ChatContactSerializer(contacts_payload, many=True)
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def chat_messages(request):
    user = request.user
    translator = MessageTranslator()

    if request.method == "GET":
        with_user_id = request.query_params.get("with_user_id")
        display_lang = normalize_lang(
            request.query_params.get("language") or getattr(user, "preferred_language", "en")
        )
        if not with_user_id:
            return Response({"detail": "with_user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = get_user_model().objects.get(id=with_user_id)
        except get_user_model().DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        thread = ChatMessage.objects.filter(
            Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)
        ).select_related("sender", "receiver")

        thread.filter(sender=other_user, receiver=user, is_read=False).update(is_read=True)
        serializer = ChatMessageSerializer(thread, many=True)
        payload = []
        for item in serializer.data:
            source_text = item["source_text"]
            translated_text = item["translated_text"]
            source_language = normalize_lang(item["source_language"])
            translated_language = normalize_lang(item["translated_language"])

            if display_lang == source_language:
                display_text = source_text
            elif display_lang == translated_language and translated_text:
                display_text = translated_text
            else:
                display_text = translator.translate(source_text, display_lang)

            payload.append(
                {
                    **item,
                    "display_text": display_text,
                    "display_language": display_lang,
                }
            )

        return Response(payload)

    receiver_id = request.data.get("receiver_id")
    message = (request.data.get("message") or "").strip()
    source_lang = normalize_lang(request.data.get("sender_language") or request.data.get("language") or getattr(user, "preferred_language", "en"))

    if not receiver_id or not message:
        return Response({"detail": "receiver_id and message are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        receiver = get_user_model().objects.get(id=receiver_id)
    except get_user_model().DoesNotExist:
        return Response({"detail": "Receiver not found"}, status=status.HTTP_404_NOT_FOUND)

    if not request.data.get("sender_language") and message:
        detected_lang = translator.detect_lang(message)
        if detected_lang:
            source_lang = normalize_lang(detected_lang)

    target_lang = normalize_lang(getattr(receiver, "preferred_language", "en"))
    translated = message if target_lang == source_lang else translator.translate(message, target_lang)

    chat = ChatMessage.objects.create(
        sender=user,
        receiver=receiver,
        source_text=message,
        source_language=source_lang,
        translated_text=translated,
        translated_language=target_lang,
    )
    return Response(ChatMessageSerializer(chat).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def chat_message_detail(request, message_id):
    user = request.user
    translator = MessageTranslator()

    try:
        chat = ChatMessage.objects.select_related("receiver").get(id=message_id)
    except ChatMessage.DoesNotExist:
        return Response({"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

    if chat.sender_id != user.id:
        return Response({"detail": "You can only modify your own messages"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        chat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    new_message = (request.data.get("message") or "").strip()
    if not new_message:
        return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    source_lang = normalize_lang(request.data.get("sender_language") or chat.source_language or "en")
    if not request.data.get("sender_language"):
        detected_lang = translator.detect_lang(new_message)
        if detected_lang:
            source_lang = normalize_lang(detected_lang)

    target_lang = normalize_lang(getattr(chat.receiver, "preferred_language", "en"))
    translated = new_message if target_lang == source_lang else translator.translate(new_message, target_lang)

    chat.source_text = new_message
    chat.source_language = source_lang
    chat.translated_text = translated
    chat.translated_language = target_lang
    chat.save(update_fields=["source_text", "source_language", "translated_text", "translated_language"])

    return Response(ChatMessageSerializer(chat).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat_message_delete(request, message_id):
    user = request.user
    try:
        chat = ChatMessage.objects.get(id=message_id)
    except ChatMessage.DoesNotExist:
        return Response({"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

    if chat.sender_id != user.id:
        return Response({"detail": "You can only delete your own messages"}, status=status.HTTP_403_FORBIDDEN)

    chat.delete()
    return Response({"detail": "Message deleted"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat_message_edit(request, message_id):
    user = request.user
    translator = MessageTranslator()
    try:
        chat = ChatMessage.objects.select_related("receiver").get(id=message_id)
    except ChatMessage.DoesNotExist:
        return Response({"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

    if chat.sender_id != user.id:
        return Response({"detail": "You can only edit your own messages"}, status=status.HTTP_403_FORBIDDEN)

    new_message = (request.data.get("message") or "").strip()
    if not new_message:
        return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    source_lang = normalize_lang(request.data.get("sender_language") or chat.source_language or "en")
    if not request.data.get("sender_language"):
        detected_lang = translator.detect_lang(new_message)
        if detected_lang:
            source_lang = normalize_lang(detected_lang)

    target_lang = normalize_lang(getattr(chat.receiver, "preferred_language", "en"))
    translated = new_message if target_lang == source_lang else translator.translate(new_message, target_lang)

    chat.source_text = new_message
    chat.source_language = source_lang
    chat.translated_text = translated
    chat.translated_language = target_lang
    chat.save(update_fields=["source_text", "source_language", "translated_text", "translated_language"])
    return Response(ChatMessageSerializer(chat).data, status=status.HTTP_200_OK)
