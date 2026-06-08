from django.contrib import admin

from .models import FurnitureProduct


@admin.register(FurnitureProduct)
class FurnitureProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'store', 'price', 'style', 'color_name')
    list_filter = ('category', 'store', 'style')
    search_fields = ('name', 'description', 'color_name')
    ordering = ('name',)
