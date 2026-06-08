from django.db import models
from django.contrib.auth.models import User
import json


class Room(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rooms')
    name = models.CharField(max_length=200, default='Camera mea')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Configurație cameră
    length = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()

    # Design
    style = models.CharField(max_length=50)
    palettes = models.JSONField(default=list)
    max_budget = models.IntegerField(null=True, blank=True)

    # Date generate de agenți
    furniture_suggestions = models.JSONField(default=list)
    selected_furniture_ids = models.JSONField(default=list)
    layout = models.JSONField(default=list)
    layout_variants = models.JSONField(default=list)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.user.email})"
