from rest_framework import serializers
from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            'id', 'name', 'created_at', 'updated_at',
            'length', 'width', 'height',
            'style', 'palettes', 'max_budget',
            'furniture_suggestions', 'selected_furniture_ids',
            'layout', 'layout_variants',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RoomListSerializer(serializers.ModelSerializer):
    """Serializer compact pentru lista de camere (fără date AI voluminoase)."""
    class Meta:
        model = Room
        fields = ['id', 'name', 'style', 'length', 'width', 'height', 'max_budget', 'created_at', 'updated_at']
