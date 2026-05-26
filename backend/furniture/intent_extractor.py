import logging
import re

logger = logging.getLogger(__name__)

BUDGET_LOW_TRIGGERS = [
    'ieftin', 'ieftina', 'buget redus', 'buget mic', 'pret mic', 'preț mic',
    'accesibil', 'economic', 'fara bani', 'fără bani', 'cat mai ieftin',
    'cât mai ieftin', 'low budget', 'buget limitat',
]

FEATURE_USER_TRIGGERS = {
    'pet-friendly': [
        'pisic', 'pisica', 'câine', 'caine', 'animal de companie', 'animale de companie',
        'animale', 'pet-friendly', 'pet friendly',
    ],
    'small_space': [
        'living mic', 'spațiu mic', 'spatiu mic', 'spații mici', 'spatii mici',
        'cameră mică', 'camera mica', 'garsonieră', 'garsoniera', 'compact', 'mic apartament',
    ],
    'washable': ['lavabil', 'material lavabil', 'husă lavabilă', 'husa lavabila', 'se spală', 'se spala'],
    'scratch_resistant': ['anti-zgâriet', 'anti zgâriet', 'anti-zgariet', 'zgâriet', 'zgariet'],
    'durable': ['rezistent', 'durabil', 'robust', 'solid'],
}

FEATURE_SEARCH_TERMS = {
    'pet-friendly': ['pet-friendly'],
    'small_space': ['spațiu mic', 'spații mici', 'living mic', 'compact'],
    'washable': ['lavabil', 'material lavabil'],
    'scratch_resistant': ['anti-zgârieturi', 'anti zgârieturi'],
    'durable': ['rezistent', 'durabil'],
}

COLOR_WORDS = [
    'gri', 'alb', 'negru', 'bej', 'albastru', 'verde', 'maro', 'antracit',
    'reci', 'cald', 'calde', 'roz', 'galben', 'portocaliu', 'vișiniu', 'visiniu',
]

CATEGORY_ALIASES = {
    'canapea': 'seating',
    'canapele': 'seating',
    'fotoliu': 'seating',
    'sofa': 'seating',
    'biblioteca': 'storage',
    'bibliotecă': 'storage',
    'biblioteci': 'storage',
    'dulap': 'storage',
    'raft': 'storage',
    'masa': 'table',
    'masă': 'table',
    'mese': 'table',
    'pat': 'bed',
    'paturi': 'bed',
    'dormitor': 'bed',
    'lampa': 'lighting',
    'lampă': 'lighting',
    'iluminat': 'lighting',
    'covor': 'decor',
    'oglind': 'decor',
    'pern': 'decor',
    'decorativ': 'decor',
    'decorati': 'decor',
    'decorați': 'decor',
}

SOCIAL_SLEEP_TRIGGERS = [
    'sotie', 'soție', 'sot', 'soț', 'frate', 'sora', 'soră', 'coleg de cameră',
    'coleg de camera', 'coleg de camer', 'roommate', 'cuplu', 'partener',
    'doi adulti', 'doi adulți', 'matrimonial', 'pat dublu',
    '2 persoane', 'doi persoane', 'doua persoane', 'două persoane',
    'pentru 2', 'pentru doi', 'de 2 persoane',
]

DECOR_TRIGGERS = [
    'decorativ', 'decorativa', 'infrumuset', 'înfrumuseț', 'amenajare estetic',
    'accesorii', 'sa infrumuseteze', 'să înfrumusețeze', 'aspect placut',
]

# Mapare text utilizator -> valoare style din custom_products.json / DB
STYLE_FROM_TEXT = (
    ('scandinavian', ('scandinavian', 'scandinav', 'scandinava', 'nordic')),
    ('modern', ('modern', 'moderna', 'contemporan')),
    ('industrial', ('industrial', 'industriala', 'loft')),
    ('minimalist', ('minimalist', 'minimalista', 'minimal')),
    ('classic', ('classic', 'clasic', 'clasica', 'clasică')),
)


def _extract_max_price_from_text(text: str):
    lowered = text.lower()
    patterns = [
        r'(?:buget|budget|max(?:im)?|sub|pana\s+la|până\s+la|in\s+jur\s+de|în\s+jur\s+de|aprox(?:imativ)?|de\s+maxim|cel mult)\s*(?:de\s*)?(\d{3,5})',
        r'(\d{3,5})\s*(?:lei|ron)\b',
    ]
    found = []
    for pattern in patterns:
        for match in re.finditer(pattern, lowered):
            found.append(int(match.group(1)))
    return min(found) if found else None


def _text_mentions_any(text: str, triggers: list) -> bool:
    lowered = text.lower()
    return any(trigger in lowered for trigger in triggers)


def _filter_features_by_user_text(user_text: str, features: list) -> list:
    kept = []
    for feature in features:
        triggers = FEATURE_USER_TRIGGERS.get(feature, [])
        if triggers and _text_mentions_any(user_text, triggers):
            kept.append(feature)
        else:
            logger.debug('[Intent] Feature eliminat: %s', feature)
    return kept


def _color_word_in_text(word: str, lowered: str) -> bool:
    """Evită potriviri parazite (ex. „alb” în cuvinte unrelated)."""
    if word in ('alb', 'alba'):
        return bool(re.search(r'\balb[aă]?\b', lowered))
    return bool(re.search(rf'\b{re.escape(word)}\b', lowered)) or word in lowered


def _filter_colors_by_user_text(user_text: str, color_keywords: list) -> list:
    lowered = user_text.lower()
    from_text = [c for c in COLOR_WORDS if _color_word_in_text(c, lowered)]
    kept = [c for c in color_keywords if c.lower() in lowered or _color_word_in_text(c.lower(), lowered)]
    for c in from_text:
        if c not in kept:
            kept.append(c)
    return kept


def _infer_category_from_text(text: str) -> str | None:
    lowered = text.lower()

    if _text_mentions_any(lowered, DECOR_TRIGGERS):
        if any(w in lowered for w in ('lampa', 'lampă', 'iluminat')):
            return 'lighting'
        return 'decor'

    for alias, category in CATEGORY_ALIASES.items():
        if alias in lowered:
            return category

    sleep_ctx = any(
        w in lowered for w in ('dorm', 'pat', 'dormitor', 'cameră', 'camera', 'odihn')
    )
    if sleep_ctx and _text_mentions_any(lowered, SOCIAL_SLEEP_TRIGGERS):
        return 'bed'

    if _text_mentions_any(lowered, ['coleg de cameră', 'coleg de camera', 'roommate']):
        return 'bed'

    return None


def _infer_style_from_text(text: str) -> str | None:
    """Detectează stilul menționat (ex. „stil scandinav”, „modern”)."""
    lowered = text.lower()
    for style_db, aliases in STYLE_FROM_TEXT:
        if any(alias in lowered for alias in aliases):
            return style_db
    return None


def _infer_prefer_couple_bed(text: str) -> bool:
    """Utilizatorul sugerează pat pentru 2 persoane, fără a cere explicit „matrimonial”."""
    lowered = text.lower()
    if 'single' in lowered or 'o persoana' in lowered or 'o persoană' in lowered:
        return False
    sleep_ctx = any(w in lowered for w in ('dorm', 'pat', 'dormitor', 'camer'))
    if not sleep_ctx and 'pat' not in lowered:
        return False
    return _text_mentions_any(lowered, SOCIAL_SLEEP_TRIGGERS)


def _infer_search_keywords(text: str) -> list:
    """Doar termeni expliciți din text — nu deduce matrimonial/dublu ca filtru."""
    lowered = text.lower()
    keywords = []

    if 'extensibil' in lowered:
        keywords.append('extensibil')
    if 'coltar' in lowered or 'colțar' in lowered:
        keywords.append('colțar')
    if 'matrimonial' in lowered:
        keywords.append('matrimonial')
    if 'pat dublu' in lowered or 'dublu' in lowered:
        keywords.append('dublu')

    return list(dict.fromkeys(keywords))


def _apply_budget_tier(intent: dict, user_text: str):
    """„Ieftin” / buget redus → sortare crescătoare, fără plafon artificial dacă nu e cifră."""
    if intent.get('max_price') is not None:
        return
    if _text_mentions_any(user_text, BUDGET_LOW_TRIGGERS):
        intent['sort_by'] = 'price_asc'
        intent['budget_tier'] = 'low'


def _align_intent_with_user_text(user_text: str, intent: dict) -> dict:
    text_category = _infer_category_from_text(user_text)
    if text_category:
        intent['category'] = text_category

    intent['features'] = _filter_features_by_user_text(user_text, intent.get('features') or [])
    intent['color_keywords'] = _filter_colors_by_user_text(user_text, intent.get('color_keywords') or [])

    text_style = _infer_style_from_text(user_text)
    if text_style:
        intent['style'] = text_style

    inferred_kw = _infer_search_keywords(user_text)
    existing_kw = intent.get('search_keywords') or []
    merged = list(dict.fromkeys(existing_kw + inferred_kw))
    intent['search_keywords'] = [k for k in merged if k]

    if _text_mentions_any(user_text, DECOR_TRIGGERS) and not intent.get('decor_suggestion'):
        intent['decor_suggestion'] = (
            'perne decorative, lămpi de masă sau podea, oglinzi, covor, accesorii de perete'
        )

    intent['prefer_couple_bed'] = _infer_prefer_couple_bed(user_text)

    _apply_budget_tier(intent, user_text)
    return intent


def _fallback_intent(user_text: str) -> dict:
    text = user_text.lower()
    intent = {
        'category': _infer_category_from_text(user_text),
        'max_price': _extract_max_price_from_text(user_text),
        'sort_by': None,
        'budget_tier': None,
        'style': None,
        'color_keywords': [],
        'search_keywords': _infer_search_keywords(user_text),
        'prefer_couple_bed': _infer_prefer_couple_bed(user_text),
        'features': [],
        'decor_suggestion': None,
    }

    intent['style'] = _infer_style_from_text(user_text)

    intent['color_keywords'] = [c for c in COLOR_WORDS if _color_word_in_text(c, text)]

    for feature, triggers in FEATURE_USER_TRIGGERS.items():
        if _text_mentions_any(user_text, triggers):
            intent['features'].append(feature.replace(' ', '_'))

    if _text_mentions_any(user_text, DECOR_TRIGGERS):
        intent['decor_suggestion'] = 'perne, lămpi, oglinzi, covor'

    _apply_budget_tier(intent, user_text)
    return intent


def extract_intent(user_text: str, room: dict | None = None, system_prompt: str | None = None) -> dict:
    """
    Extrage intenția de căutare din textul utilizatorului folosind reguli euristice.
    Nu folosește LLM — doar criterii menționate explicit (tip, stil, buget, culori).
    """
    del system_prompt, room  # păstrate pentru compatibilitate API
    intent = _normalize_intent(_fallback_intent(user_text))
    merged = _merge_price_from_user_text(user_text, intent)
    return _align_intent_with_user_text(user_text, merged)


def _merge_price_from_user_text(user_text: str, intent: dict) -> dict:
    from_text = _extract_max_price_from_text(user_text)
    if from_text is None:
        return intent
    llm_price = intent.get('max_price')
    if llm_price is None:
        intent['max_price'] = float(from_text)
    else:
        intent['max_price'] = float(min(from_text, llm_price))
    return intent


def _normalize_intent(intent: dict) -> dict:
    valid_categories = {'seating', 'storage', 'table', 'bed', 'lighting', 'decor', None}
    valid_styles = {'modern', 'scandinavian', 'industrial', 'minimalist', 'classic', None}

    category = intent.get('category')
    if category not in valid_categories:
        category = None

    style = intent.get('style')
    if style not in valid_styles:
        style = None

    max_price = intent.get('max_price')
    if max_price is not None:
        try:
            max_price = float(max_price)
            if max_price <= 0:
                max_price = None
        except (TypeError, ValueError):
            max_price = None

    sort_by = intent.get('sort_by')
    if sort_by not in ('price_asc', None):
        sort_by = 'price_asc' if sort_by else None

    budget_tier = intent.get('budget_tier')
    if budget_tier not in ('low', None):
        budget_tier = 'low' if budget_tier else None

    color_keywords = intent.get('color_keywords') or []
    if not isinstance(color_keywords, list):
        color_keywords = [str(color_keywords)]
    color_keywords = [str(k).strip() for k in color_keywords if k]

    search_keywords = intent.get('search_keywords') or []
    if not isinstance(search_keywords, list):
        search_keywords = [str(search_keywords)]
    search_keywords = [str(k).strip() for k in search_keywords if k]

    features = intent.get('features') or []
    if not isinstance(features, list):
        features = [str(features)]
    features = [str(f).strip().lower().replace(' ', '_') for f in features if f]

    decor_suggestion = intent.get('decor_suggestion')
    if decor_suggestion is not None:
        decor_suggestion = str(decor_suggestion).strip() or None

    is_furniture_query = intent.get('is_furniture_query')
    if isinstance(is_furniture_query, str):
        is_furniture_query = is_furniture_query.strip().lower() in ('true', '1', 'yes', 'da')
    elif is_furniture_query is not None:
        is_furniture_query = bool(is_furniture_query)

    prefer_couple_bed = bool(intent.get('prefer_couple_bed'))

    return {
        'category': category,
        'max_price': max_price,
        'sort_by': sort_by,
        'budget_tier': budget_tier,
        'style': style,
        'color_keywords': color_keywords,
        'search_keywords': search_keywords,
        'prefer_couple_bed': prefer_couple_bed,
        'features': features,
        'decor_suggestion': decor_suggestion,
        'is_furniture_query': is_furniture_query,
    }


def get_feature_search_terms(feature: str) -> list[str]:
    key = feature.lower().replace(' ', '_')
    return FEATURE_SEARCH_TERMS.get(key, [feature.replace('_', ' ')])
