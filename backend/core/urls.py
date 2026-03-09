from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import CustomTokenObtainPairView, simple_login

from .chatbot_views import (
    chatbot_message,
    chatbot_intents,
    chatbot_info,
    chatbot_conversation,
)

def home(request):
    return JsonResponse({"message": "Backend Running Successfully 🚀"})


urlpatterns = [

    path('', home),

    path('admin/', admin.site.urls),

    # AUTH
    path('api/auth/', include('users.urls')),
    path("api/users/", include("users.urls")),   # 🔴 THIS LINE IS IMPORTANT

    path('api/token/', CustomTokenObtainPairView.as_view()),
    path('api/auth/login/', simple_login),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    # APPS
    path("api/orders/", include("orders.urls")),
    path("api/products/", include("products.urls")),
    path("api/pricing/", include("pricing.urls")),

    # CHATBOT
    path("api/chatbot/message/", chatbot_message),
    path("api/chatbot/intents/", chatbot_intents),
    path("api/chatbot/info/", chatbot_info),
    path("api/chatbot/conversation/", chatbot_conversation),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    