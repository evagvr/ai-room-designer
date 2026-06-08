from django.urls import path
from .views import RoomListCreateView, RoomDetailView, RoomRenameView

urlpatterns = [
    path('',           RoomListCreateView.as_view(), name='room-list-create'),
    path('<int:pk>/',  RoomDetailView.as_view(),     name='room-detail'),
    path('<int:pk>/rename/', RoomRenameView.as_view(), name='room-rename'),
]
