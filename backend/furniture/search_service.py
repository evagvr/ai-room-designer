from decimal import Decimal

from django.db.models import Q

from .intent_extractor import get_feature_search_terms
from .models import FurnitureProduct
from .serializers import FurnitureProductSerializer

DEFAULT_LIMIT = 12

SINGLE_BED_MARKERS = ('copii', 'copil', '90 x', '90x', 'single', 'o persoana', 'o persoană', '120x200', '120 x')

# Termeni extra pentru potrivire culoare în color_name / name / description
COLOR_MATCH_TERMS = {
    'alb': ('alb', 'albă', 'alba', 'white', 'ivoriu', 'crem'),
    'negru': ('negru', 'black', 'antracit', 'gri închis', 'gri inchis'),
    'gri': ('gri', 'gray', 'grey', 'antracit', 'gri-albastru', 'gri deschis'),
    'bej': ('bej', 'beige', 'nude', 'sand', 'crem'),
    'albastru': ('albastru', 'blue', 'bleu', 'bleumarin'),
    'verde': ('verde', 'green', 'oliv', 'sage'),
    'maro': ('maro', 'brown', 'stejar', 'nuc', 'walnut', 'oak', 'wenge'),
    'roz': ('roz', 'pink', 'mauve'),
    'galben': ('galben', 'yellow', 'mustar'),
    'portocaliu': ('portocaliu', 'orange', 'teracot'),
    'visiniu': ('visiniu', 'vișiniu', 'burgundy', 'bordo'),
    'reci': ('gri', 'albastru', 'verde', 'rece', 'reci'),
    'cald': ('bej', 'maro', 'teracot', 'cald', 'calde', 'warm'),
    'calde': ('bej', 'maro', 'teracot', 'cald', 'calde', 'warm'),
}


def _apply_room_dimensions(qs, room: dict | None):
    if not room:
        return qs
    rl = Decimal(str(room['length']))
    rw = Decimal(str(room['width']))
    rh = Decimal(str(room.get('height') or 99))

    fits_floor = (
        Q(width__lte=rl, depth__lte=rw)
        | Q(width__lte=rw, depth__lte=rl)
    )
    return qs.filter(fits_floor).filter(height__lte=rh)


def _apply_category(qs, category):
    if category:
        qs = qs.filter(category=category)
    return qs


def _apply_style(qs, style):
    if style:
        qs = qs.filter(style=style)
    return qs


def _apply_max_price(qs, max_price):
    if max_price is not None:
        qs = qs.filter(price__lte=Decimal(str(max_price)))
    return qs


def _apply_colors(qs, color_keywords: list):
    """Filtru culoare: potrivire în color_name, name sau description."""
    if not color_keywords:
        return qs
    color_q = Q()
    for kw in color_keywords:
        terms = COLOR_MATCH_TERMS.get(str(kw).lower().strip(), (str(kw).lower(),))
        for term in terms:
            if not term:
                continue
            color_q |= Q(color_name__icontains=term)
            color_q |= Q(name__icontains=term)
            color_q |= Q(description__icontains=term)
    return qs.filter(color_q)


def _apply_features(qs, features: list):
    """Toate feature-urile cerute trebuie să apară în descriere."""
    for feature in features:
        feature_q = Q()
        for term in get_feature_search_terms(feature):
            feature_q |= Q(description__icontains=term)
        if feature_q:
            qs = qs.filter(feature_q)
    return qs


def _apply_search_keywords(qs, search_keywords: list):
    """Cel puțin un cuvânt cheie în nume sau descriere."""
    if not search_keywords:
        return qs
    kw_q = Q()
    for kw in search_keywords:
        kw = str(kw).strip()
        if not kw:
            continue
        kw_q |= Q(name__icontains=kw)
        kw_q |= Q(description__icontains=kw)
    return qs.filter(kw_q) if kw_q else qs


def _build_base_queryset(
    intent: dict,
    room: dict | None,
    apply_price: bool = True,
    *,
    apply_colors: bool = True,
    apply_features: bool = True,
    apply_keywords: bool = True,
):
    qs = FurnitureProduct.objects.all()
    qs = _apply_room_dimensions(qs, room)
    qs = _apply_category(qs, intent.get('category'))
    qs = _apply_style(qs, intent.get('style'))
    if apply_price:
        qs = _apply_max_price(qs, intent.get('max_price'))
    if apply_colors:
        qs = _apply_colors(qs, intent.get('color_keywords') or [])
    if apply_features:
        qs = _apply_features(qs, intent.get('features') or [])
    if apply_keywords:
        qs = _apply_search_keywords(qs, intent.get('search_keywords') or [])
    return qs


def _text_has_any(text: str, markers: tuple) -> bool:
    return any(m in text for m in markers)


def _relevance_score(product: FurnitureProduct, intent: dict) -> float:
    score = 0.0
    name_l = product.name.lower()
    desc_l = (product.description or '').lower()
    color_l = (product.color_name or '').lower()
    text_blob = f'{name_l} {desc_l} {color_l}'

    if intent.get('prefer_couple_bed') and product.category == 'bed':
        width = float(product.width)
        if width >= 1.6:
            score += 18
        elif width >= 1.4:
            score += 14
        elif width >= 1.2:
            score += 6
        if _text_has_any(text_blob, ('matrimonial', 'dublu', '180', '160', '200')):
            score += 10
        if _text_has_any(text_blob, SINGLE_BED_MARKERS):
            score -= 25

    for kw in intent.get('color_keywords') or []:
        terms = COLOR_MATCH_TERMS.get(str(kw).lower(), (str(kw).lower(),))
        if any(t in color_l for t in terms):
            score += 15
        elif any(t in text_blob for t in terms):
            score += 8

    return score


def _order_products(products: list, intent: dict) -> list:
    if intent.get('sort_by') == 'price_asc' or intent.get('budget_tier') == 'low':
        return sorted(
            products,
            key=lambda p: (float(p.price), -_relevance_score(p, intent)),
        )
    return sorted(
        products,
        key=lambda p: (_relevance_score(p, intent), -float(p.price)),
        reverse=True,
    )


def _search_with_strategies(intent: dict, room: dict | None, apply_price: bool, limit: int) -> list:
    """
    Aplică toate criteriile din intent; relaxare progresivă doar pentru features/keywords,
    nu pentru categorie, stil, culoare sau preț (dacă sunt setate).
    """
    has_colors = bool(intent.get('color_keywords'))
    has_features = bool(intent.get('features'))
    has_keywords = bool(intent.get('search_keywords'))

    strategies = [
        {'colors': True, 'features': True, 'keywords': True},
        {'colors': True, 'features': True, 'keywords': False},
        {'colors': True, 'features': False, 'keywords': False},
    ]
    if not has_colors:
        strategies = [
            {'colors': False, 'features': True, 'keywords': True},
            {'colors': False, 'features': True, 'keywords': False},
            {'colors': False, 'features': False, 'keywords': False},
        ]

    for strategy in strategies:
        if has_features and not strategy['features']:
            continue
        if has_keywords and not strategy['keywords'] and strategy != strategies[-1]:
            continue

        qs = _build_base_queryset(
            intent,
            room,
            apply_price=apply_price,
            apply_colors=strategy['colors'] and has_colors,
            apply_features=strategy['features'] and has_features,
            apply_keywords=strategy['keywords'] and has_keywords,
        )
        products = list(qs.distinct())
        if products:
            return _order_products(products, intent)[:limit]

    return []


def _search_products(intent: dict, room: dict | None, apply_price: bool, limit: int) -> list:
    if not intent.get('category'):
        return []
    return _search_with_strategies(intent, room, apply_price=apply_price, limit=limit)


def _budget_fallback_products(intent: dict, room: dict | None, limit: int):
    """Relaxare doar la preț — restul criteriilor rămân."""
    return _search_with_strategies(intent, room, apply_price=False, limit=limit)


def run_search(intent: dict, room: dict | None = None, limit: int = DEFAULT_LIMIT) -> dict:
    products = _search_products(intent, room, apply_price=True, limit=limit)
    budget_fallback = False
    dimension_fallback = False
    max_price = intent.get('max_price')

    if not products and max_price is not None:
        budget_fallback = True
        products = _budget_fallback_products(intent, room, limit=limit)

    if not products and room:
        dimension_fallback = True
        products = _search_products(intent, None, apply_price=True, limit=limit)
        if not products and max_price is not None:
            budget_fallback = True
            products = _budget_fallback_products(intent, None, limit=limit)

    serialized = FurnitureProductSerializer(products, many=True).data
    message = build_assistant_message(
        intent=intent,
        products=serialized,
        budget_fallback=budget_fallback,
        dimension_fallback=dimension_fallback,
        room=room,
    )

    return {
        'products': serialized,
        'message': message,
        'budget_fallback': budget_fallback,
        'dimension_fallback': dimension_fallback,
    }


def build_assistant_message(
    intent: dict,
    products: list,
    budget_fallback: bool = False,
    dimension_fallback: bool = False,
    room: dict | None = None,
) -> str:
    count = len(products)
    max_price = intent.get('max_price')
    category = intent.get('category')
    style = intent.get('style')
    colors = intent.get('color_keywords') or []
    features = intent.get('features') or []

    style_labels = {
        'scandinavian': 'scandinav',
        'modern': 'modern',
        'industrial': 'industrial',
        'minimalist': 'minimalist',
        'classic': 'clasic',
    }

    category_labels = {
        'seating': 'canapele și seating',
        'storage': 'soluții de depozitare',
        'table': 'mese',
        'bed': 'paturi',
        'lighting': 'iluminat',
        'decor': 'decorațiuni și accesorii',
    }

    if count == 0:
        parts = ['Nu am găsit produse care să respecte toate criteriile']
        if category:
            parts.append(f' ({category_labels.get(category, category)}')
        if style:
            parts.append(f', stil {style_labels.get(style, style)}')
        if colors:
            parts.append(f', culoare {", ".join(colors)}')
        if max_price:
            parts.append(f', sub {int(max_price)} lei')
        if category or style or colors:
            parts.append(')')
        parts.append(' în catalogul tău.')
        return ''.join(parts)

    intro_parts = []
    if dimension_fallback and room:
        intro_parts.append(
            f'Nicio piesă din categoria {category_labels.get(category, "mobilier")} nu încape în dimensiunile reduse ale camerei tale ({room["length"]}×{room["width"]} m). '
            f'Iată însă cele mai compacte opțiuni din catalog:'
        )
    else:
        intro_parts.append(f'Am găsit {count} produse')
        if category:
            intro_parts.append(f' — {category_labels.get(category, category)}')
        if style:
            intro_parts.append(f', stil {style_labels.get(style, style)}')
        if colors:
            intro_parts.append(f', culoare {", ".join(colors)}')
        if max_price and not budget_fallback:
            intro_parts.append(f', până la {int(max_price)} lei')
        elif budget_fallback and max_price:
            intro_parts.append(f' (peste bugetul de {int(max_price)} lei, cele mai apropiate opțiuni)')
        elif intent.get('sort_by') == 'price_asc' or intent.get('budget_tier') == 'low':
            intro_parts.append(', sortate de la cele mai accesibile')
        if room:
            intro_parts.append(f', pentru camera {room["length"]}×{room["width"]} m')
        intro_parts.append('.')

    parts = [''.join(intro_parts)]

    if features:
        parts.append(f' Filtru activ: {", ".join(features)}.')

    if intent.get('prefer_couple_bed') and category == 'bed':
        parts.append(' Prioritizat paturi pentru două persoane.')

    if count <= 3:
        parts.append(f' Recomandări: {", ".join(p["name"] for p in products[:3])}.')
    else:
        parts.append(' Vezi cardurile de mai jos.')

    return ''.join(parts)
