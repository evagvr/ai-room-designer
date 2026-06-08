from rest_framework import serializers

from .dimensions import normalize_dimension_meters
from .image_utils import normalize_image_url
from .models import FurnitureProduct


class FurnitureProductSerializer(serializers.ModelSerializer):
    """Serializer compatibil cu formatul canvas din frontend."""

    id = serializers.IntegerField(read_only=True)
    color = serializers.CharField(source='color_hex')
    colorName = serializers.CharField(source='color_name')

    class Meta:
        model = FurnitureProduct
        fields = [
            'id',
            'name',
            'category',
            'store',
            'url',
            'image_url',
            'price',
            'style',
            'color',
            'colorName',
            'color_hex',
            'color_name',
            'width',
            'depth',
            'height',
            'description',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        url = data.get('image_url') or ''
        if 'unsplash.com' in url.lower():
            data['image_url'] = None
        else:
            data['image_url'] = normalize_image_url(url) or None
        for dim in ('width', 'depth', 'height'):
            if data.get(dim) is not None:
                default = 1.0 if dim != 'depth' else 0.8
                data[dim] = normalize_dimension_meters(data[dim], default)
        return data
