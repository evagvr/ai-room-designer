from django.urls import path

from .views import FurnitureSearchView

urlpatterns = [
    path('search/', FurnitureSearchView.as_view(), name='furniture-search'),
]
