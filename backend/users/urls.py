from django.urls import path

from .views import RegisterView, addresses, map_reverse, map_search, profile_view, validate_token

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', profile_view, name='profile'),
    path('validate-token/', validate_token, name='validate-token'),
    path('addresses/', addresses, name='addresses'),
    path('map-search/', map_search, name='map-search'),
    path('map-reverse/', map_reverse, name='map-reverse'),
]
