from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .agent1_designer import run_agent1
from .agent2_optimizer import run_agent2, check_collisions


class Agent1View(APIView):
    """
    POST /api/agents/designer/
    Filtrează mobilier din catalogul DB (stil cameră, buget, opțional query utilizator).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        room = data.get('room')
        style = data.get('style')
        palettes = data.get('palettes', [])
        max_budget = data.get('maxBudget') or None
        user_query = (data.get('query') or data.get('userQuery') or '').strip() or None

        # Validare input
        errors = {}
        if not room or not all(k in room for k in ('length', 'width', 'height')):
            errors['room'] = 'Dimensiunile camerei sunt obligatorii (length, width, height).'
        if not style:
            errors['style'] = 'Stilul de design este obligatoriu.'
        if not palettes:
            errors['palettes'] = 'Cel puțin o paletă de culori este obligatorie.'
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room_data = {
                'length': float(room['length']),
                'width':  float(room['width']),
                'height': float(room['height']),
            }
        except (ValueError, TypeError):
            return Response({'error': 'Dimensiunile camerei trebuie să fie numere.'}, status=status.HTTP_400_BAD_REQUEST)

        items = run_agent1(room_data, style, palettes, max_budget, user_query=user_query)
        return Response({
            'items': items,
            'count': len(items),
            'totalPrice': sum(i.get('price', 0) for i in items),
        })


class Agent2View(APIView):
    """
    POST /api/agents/optimizer/
    Calculează pozițiile optime pentru mobilierul selectat.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        room = data.get('room')
        selected_items = data.get('selectedItems', [])
        variant = int(data.get('variant', 0))

        if not room or not selected_items:
            return Response(
                {'error': 'room și selectedItems sunt obligatorii.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            room_data = {
                'length': float(room['length']),
                'width':  float(room['width']),
                'height': float(room['height']),
            }
        except (ValueError, TypeError):
            return Response({'error': 'Dimensiunile camerei trebuie să fie numere.'}, status=status.HTTP_400_BAD_REQUEST)

        layout = run_agent2(room_data, selected_items, variant)
        collisions = check_collisions(layout)

        return Response({
            'layout': layout,
            'collisions': collisions,
            'variant': variant,
        })


class Agent2MultiVariantView(APIView):
    """
    POST /api/agents/optimizer/variants/
    Generează mai multe variante de layout simultan.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        room = data.get('room')
        selected_items = data.get('selectedItems', [])
        num_variants = min(int(data.get('numVariants', 3)), 5)  # max 5

        if not room or not selected_items:
            return Response(
                {'error': 'room și selectedItems sunt obligatorii.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            room_data = {
                'length': float(room['length']),
                'width':  float(room['width']),
                'height': float(room['height']),
            }
        except (ValueError, TypeError):
            return Response({'error': 'Dimensiunile camerei trebuie să fie numere.'}, status=status.HTTP_400_BAD_REQUEST)

        variants = []
        for v in range(num_variants):
            layout = run_agent2(room_data, selected_items, variant=v)
            variants.append({
                'variant': v,
                'layout': layout,
                'collisions': check_collisions(layout),
            })

        return Response({'variants': variants})


class OllamaHealthView(APIView):
    """
    GET /api/agents/health/
    Verifică dacă Ollama este disponibil.
    """
    permission_classes = []

    def get(self, request):
        from .ollama_service import ollama
        from django.conf import settings
        try:
            import urllib.request
            url = settings.OLLAMA_BASE_URL.rstrip('/') + '/api/tags'
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = __import__('json').loads(resp.read())
            models = [m['name'] for m in data.get('models', [])]
            return Response({
                'status': 'ok',
                'ollama_url': settings.OLLAMA_BASE_URL,
                'configured_model': settings.OLLAMA_MODEL,
                'available_models': models,
                'model_ready': settings.OLLAMA_MODEL in models or
                               any(settings.OLLAMA_MODEL in m for m in models),
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e),
                'ollama_url': settings.OLLAMA_BASE_URL,
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
