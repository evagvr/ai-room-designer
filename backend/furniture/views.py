import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .intent_extractor import extract_intent
from .relevance import OFF_TOPIC_MESSAGE, is_furniture_related
from .search_service import run_search

logger = logging.getLogger(__name__)


def build_intent_system_prompt(room: dict | None = None) -> str:
    """
    Documentație schema intenție (folosită doar ca referință; extragerea e euristică).
    """
    room_block = ''
    if room:
        room_block = f"""
DIMENSIUNI CAMERĂ (metri, din configurarea utilizatorului — OBLIGATORIU de respectat la recomandare):
- Lungime (axa principală): {room['length']} m
- Lățime: {room['width']} m
- Înălțime: {room['height']} m
Orice piesă recomandată trebuie să încapă în plan: lățimea și adâncimea piesei nu pot depăși aceste limite (ține cont de rotație 90°).
"""

    return f"""Ești un extractor de intenții pentru căutare mobilier în România.
Răspunzi EXCLUSIV cu un obiect JSON valid, fără markdown, fără backticks, fără text în afara JSON-ului.
{room_block}
Schema JSON:
{{
  "category": "seating" | "storage" | "table" | "bed" | "lighting" | "decor" | null,
  "max_price": number | null,
  "sort_by": "price_asc" | null,
  "budget_tier": "low" | null,
  "style": "modern" | "scandinavian" | "industrial" | "minimalist" | "classic" | null,
  "color_keywords": ["string"],
  "search_keywords": ["string"],
  "features": ["string"],
  "decor_suggestion": "string" | null,
  "is_furniture_query": boolean
}}

=== MESAJ OFF-TOPIC ===
- is_furniture_query: false dacă întrebarea NU are legătură cu mobilier, decor cameră sau amenajare interior (ex: rețete, vreme, programare, sport, sănătate, glume)
- is_furniture_query: true dacă caută piese, buget pentru mobilă, amenajează living/dormitor, sau descrie nevoi de mobilier
- Nu seta category/features inventate pentru mesaje off-topic; doar is_furniture_query: false

=== CATEGORII ===
- canapea, fotoliu -> seating
- bibliotecă, dulap, raft -> storage
- masă -> table
- pat, dormitor -> bed
- lampă, iluminat -> lighting
- decorativ, înfrumusețat spațiul, accesorii, perne, oglinzi (fără mobilier greu) -> decor (sau lighting dacă cere explicit lămpi)
- NU pune seating/storage dacă utilizatorul vrea doar decorațiuni

=== BUGET & PREȚ ===
- Cifră explicită: "sub 1500", "max 2000 lei", "buget 1000" -> max_price (număr)
- Fără cifră dar "ieftin", "buget redus", "preț mic", "accesibil", "economic" -> sort_by: "price_asc", budget_tier: "low", max_price: null
- Nu inventa max_price dacă utilizatorul nu dă cifră și nu cere ieftin

=== STIL & CULORI (doar dacă sunt menționate) ===
- style: doar dacă spune modern, scandinavian, industrial, minimalist, classic
- color_keywords: doar culori/tonuri numite (gri, verde, reci, calde, bej...) — altfel []
- Dacă nu menționează stil/culoare -> null respectiv []

=== DEDUCȚII CONTEXTUALE (search_keywords + category) ===
Context social în dormitor/cameră de dormit:
- soție, soț, sotie, frate, soră, coleg de cameră, roommate, cuplu, doi adulți
-> category: "bed" dacă context de dormit
-> search_keywords: include "pat dublu", "matrimonial" (și în JSON, nu doar în features)

Copil: NU deduce pet-friendly. Doar features dacă cere lavabil/rezistent explicit.

Decor / ambient:
- decorativ, înfrumusețe, amenajare estetică, accesorii -> category: "decor" sau "lighting"
- decor_suggestion: scurt în română ce tipuri recomanzi (perne decorative, lămpi, oglinzi, covor)

=== FEATURES (doar explicite, altfel []) ===
- pet-friendly: DOAR pisică, câine, animale, pet
- small_space: living mic, spațiu mic, garsonieră, compact
- washable, scratch_resistant, durable: doar dacă sunt cerute explicit

=== REGULI FINALE ===
- Nu inventa criterii. Când ești în dubiu: null sau [].
- search_keywords: termeni extra pentru căutare în nume/descriere (ex: "pat dublu", "matrimonial", "extensibil")
"""


def parse_room(room_data) -> dict | None:
    """Parsează dimensiunile camerei din payload-ul frontend."""
    if not room_data or not isinstance(room_data, dict):
        return None
    try:
        length = float(room_data.get('length') or 0)
        width = float(room_data.get('width') or 0)
        height = float(room_data.get('height') or 0)
    except (TypeError, ValueError):
        return None
    if length <= 0 or width <= 0:
        return None
    if height <= 0:
        height = 2.5
    return {
        'length': round(length, 2),
        'width': round(width, 2),
        'height': round(height, 2),
    }


class FurnitureSearchView(APIView):
    """
    POST /api/furniture/search/
    Body: { "query": "...", "room": { "length", "width", "height" } }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = (request.data.get('query') or request.data.get('message') or '').strip()
        room = parse_room(request.data.get('room'))

        if not query:
            return Response(
                {'error': 'Textul de căutare este obligatoriu (câmpul query sau message).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(query) > 2000:
            return Response(
                {'error': 'Mesajul este prea lung (maxim 2000 caractere).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            system_prompt = build_intent_system_prompt(room)
            intent = extract_intent(query, room=room, system_prompt=system_prompt)
            logger.info('[FurnitureSearch] Intent: %s | Room: %s', intent, room)

            if not is_furniture_related(query, intent):
                return Response({
                    'message': OFF_TOPIC_MESSAGE,
                    'intent': intent,
                    'products': [],
                    'count': 0,
                    'off_topic': True,
                    'budget_fallback': False,
                    'room': room,
                })

            search_result = run_search(intent, room=room)
            message = search_result['message']

            return Response({
                'message': message,
                'intent': intent,
                'products': search_result['products'],
                'count': len(search_result['products']),
                'budget_fallback': search_result.get('budget_fallback', False),
                'off_topic': False,
                'room': room,
            })
        except Exception as exc:
            logger.exception('[FurnitureSearch] Eroare la căutare')
            return Response(
                {
                    'error': 'A apărut o eroare la procesarea cererii.',
                    'detail': str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
