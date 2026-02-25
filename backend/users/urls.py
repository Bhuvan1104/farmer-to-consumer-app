from django.urls import path
from .views import RegisterView, profile_view
from .views import validate_token

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', profile_view, name='profile'),
    path('validate-token/', validate_token, name='validate-token'),
    
]