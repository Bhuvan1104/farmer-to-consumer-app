"""core URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .chatbot_views import chatbot_message, chatbot_intents, chatbot_info, chatbot_conversation

def home(request):
    return JsonResponse({"message": "AI Farmer-Consumer Backend Running Successfully 🚀"})

urlpatterns = [
    path('', home),   # 👈 ADD THIS LINE
    path('admin/', admin.site.urls),

    path('api/auth/', include('users.urls')),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/pricing/', include('pricing.urls')),
    
    path('api/chatbot/message/', chatbot_message, name='chatbot-message'),
    path('api/chatbot/intents/', chatbot_intents, name='chatbot-intents'),
    path('api/chatbot/info/', chatbot_info, name='chatbot-info'),
    path('api/chatbot/conversation/', chatbot_conversation, name='chatbot-conversation'),
]
