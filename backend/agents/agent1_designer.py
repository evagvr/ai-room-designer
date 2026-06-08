"""
Agent 1 — Designer: filtrează mobilier din DB după stil, buget și dimensiuni cameră.
"""
from furniture.models import FurnitureProduct
from furniture.serializers import FurnitureProductSerializer


# Stiluri compatibile — dacă nu găsim suficiente produse cu stilul exact, includem și stiluri înrudite
STYLE_COMPAT = {
    'modern':       ['modern', 'minimalist'],
    'scandinavian': ['scandinavian', 'minimalist', 'modern'],
    'industrial':   ['industrial', 'modern'],
    'minimalist':   ['minimalist', 'modern', 'scandinavian'],
    'classic':      ['classic', 'modern'],
    'bohemian':     ['classic', 'modern', 'scandinavian'],
}


def run_agent1(room, style, palettes, max_budget, user_query=None):
    """
    Returnează până la 8 produse din DB filtrate după:
    - stil (cu fallback la stiluri compatibile)
    - buget maxim
    - dimensiuni cameră (piesa trebuie să încapă)
    """
    rl = float(room.get('length', 5))
    rw = float(room.get('width', 4))

    qs = FurnitureProduct.objects.all()

    # Filtrare după buget
    if max_budget:
        try:
            qs = qs.filter(price__lte=float(max_budget))
        except (ValueError, TypeError):
            pass

    # Filtrare după dimensiuni camerei (piesa trebuie să încapă cu 15% margine)
    qs = qs.filter(width__lt=rl * 0.85, depth__lt=rw * 0.85)

    # Filtrare după stil — întâi stilul exact
    accepted_styles = STYLE_COMPAT.get(style, [style, 'modern'])
    styled_qs = qs.filter(style__in=accepted_styles)

    # Dacă nu avem suficiente produse cu stilul potrivit, luăm din tot catalogul
    if styled_qs.count() < 3:
        styled_qs = qs

    # Luăm câte un produs per categorie pentru diversitate
    categories = ['seating', 'storage', 'table', 'bed', 'lighting', 'decor']
    result = []
    for cat in categories:
        item = styled_qs.filter(category=cat).order_by('?').first()
        if item:
            result.append(item)
        if len(result) >= 8:
            break

    # Dacă tot nu avem 8, completăm cu orice produs rămas
    if len(result) < 8:
        existing_ids = [p.id for p in result]
        extra = styled_qs.exclude(id__in=existing_ids).order_by('?')[:8 - len(result)]
        result.extend(extra)

    serializer = FurnitureProductSerializer(result, many=True)
    return serializer.data
