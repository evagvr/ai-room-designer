from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Room
from .serializers import RoomSerializer, RoomListSerializer


class RoomListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/rooms/         — lista camere ale utilizatorului curent
    POST /api/rooms/         — creare cameră nouă
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return RoomListSerializer
        return RoomSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/rooms/<id>/  — detalii cameră
    PUT    /api/rooms/<id>/  — update complet
    PATCH  /api/rooms/<id>/  — update parțial
    DELETE /api/rooms/<id>/  — ștergere
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RoomSerializer

    def get_queryset(self):
        return Room.objects.filter(user=self.request.user)


class RoomRenameView(APIView):
    """PATCH /api/rooms/<id>/rename/ — redenumire rapidă."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            room = Room.objects.get(pk=pk, user=request.user)
        except Room.DoesNotExist:
            return Response({'error': 'Camera nu a fost găsită.'}, status=status.HTTP_404_NOT_FOUND)
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Numele nu poate fi gol.'}, status=status.HTTP_400_BAD_REQUEST)
        room.name = name
        room.save(update_fields=['name', 'updated_at'])
        return Response({'id': room.id, 'name': room.name})
