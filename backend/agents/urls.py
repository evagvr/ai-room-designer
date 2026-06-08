from django.urls import path
from .views import Agent1View, Agent2View, Agent2MultiVariantView, OllamaHealthView

urlpatterns = [
    path('designer/',           Agent1View.as_view(),            name='agent1-designer'),
    path('optimizer/',          Agent2View.as_view(),            name='agent2-optimizer'),
    path('optimizer/variants/', Agent2MultiVariantView.as_view(),name='agent2-variants'),
    path('health/',             OllamaHealthView.as_view(),      name='ollama-health'),
]
