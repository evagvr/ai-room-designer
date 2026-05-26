"""
Detectează dacă mesajul utilizatorului ține de căutare mobilier / amenajare cameră.
"""

OFF_TOPIC_MESSAGE = (
    'Nu pot ajuta cu asta. Sunt specializat doar în căutare de mobilier și decorațiuni '
    'pentru camera ta (canapea, pat, masă, dulap, lampă, covor etc.). '
    'Descrie ce piesă cauți, bugetul sau stilul dorit — de exemplu: „canapea modernă gri, max 2000 lei”.'
)

FURNITURE_KEYWORDS = [
    'mobilier', 'mobila', 'mobilă', 'canapea', 'canapele', 'fotoliu', 'seating', 'sofa',
    'pat', 'paturi', 'saltea', 'saltea', 'somier', 'dormitor', 'masa', 'masă', 'mese',
    'scaun', 'scaune', 'birou', 'bibliotec', 'dulap', 'raft', 'rafturi', 'comoda', 'comodă',
    'noptier', 'noptieră', 'living', 'bucatarie', 'bucătărie', 'hol', 'dressing',
    'lampa', 'lampă', 'iluminat', 'veioza', 'veioză', 'covor', 'perde', 'perdă',
    'oglind', 'pern', 'tablou', 'decor', 'amenaj', 'aranj', 'furniz', 'coltar', 'colțar',
    'extensibil', 'matrimonial', 'puf', 'taburet', 'consola', 'vitrina', 'etajer',
    'ikea', 'dedeman', 'jysk', 'mobexpert', 'vivre',
]

ROOM_CONTEXT_KEYWORDS = [
    'camer', 'cameră', 'camera', 'apartament', 'garsonier', 'living', 'dormitor',
    'spațiu', 'spatiu', 'încăper', 'incaper', 'layout', 'interior',
]

SHOPPING_INTENT_KEYWORDS = [
    'caut', 'vreau', 'nevoie', 'cumpar', 'cumpăr', 'aleg', 'recomand', 'sugest',
    'ofert', 'piese', 'articol', 'produs', 'catalog',
]

OFF_TOPIC_KEYWORDS = [
    'reteta', 'rețetă', 'gateste', 'gătește', 'mancare', 'mâncare', 'restaurant',
    'vreme', 'meteo', 'ploaa', 'temperatur', 'prognoz',
    'fotbal', 'football', 'meci', 'gol', 'liga',
    'python', 'javascript', 'programare', 'cod', 'bug', 'eroare software', 'django',
    'react', 'tema', 'temă', 'examen', 'matematic', 'fizica', 'fizică', 'istorie',
    'film', 'serial', 'netflix', 'melodie', 'cantec', 'cântec', 'muzica', 'muzică',
    'politic', 'alegeri', 'presedinte', 'președinte', 'guvern',
    'cripto', 'bitcoin', 'actiuni', 'acțiuni', 'bursa', 'bursă', 'investit',
    'doctor', 'medic', 'medicament', 'simptom', 'boala', 'boală', 'spital',
    'calatorie', 'călătorie', 'vacanta', 'vacanță', 'zbor', 'hotel', 'avion',
    'masina', 'mașină', 'auto', 'motor', 'benzina', 'benzină',
    'relatie', 'relație', 'despartit', 'pizza', 'bere', 'cafenea',
]

GREETING_ONLY = {
    'salut', 'buna', 'bună', 'hello', 'hi', 'hey', 'mersi', 'mulțumesc',
    'multumesc', 'pa', 'ce faci', 'buna ziua', 'bună ziua', 'noapte buna',
}


def _normalize_text(text: str) -> str:
    return (text or '').lower().strip()


def _contains_any(text: str, keywords: list) -> bool:
    return any(k in text for k in keywords)


def is_furniture_related(user_text: str, intent: dict) -> bool:
    """
    Returnează True dacă mesajul are legătură cu mobilier/amenajare cameră.
    Combină flag-ul LLM (is_furniture_query) cu euristici pe text și intent.
    """
    text = _normalize_text(user_text)
    if len(text) < 2:
        return False

    words = set(text.replace('?', '').replace('!', '').split())
    if words <= GREETING_ONLY or text in GREETING_ONLY:
        return False

    # LLM a marcat explicit off-topic
    llm_flag = intent.get('is_furniture_query')
    if llm_flag is False:
        has_override = (
            intent.get('category')
            or _contains_any(text, FURNITURE_KEYWORDS)
        )
        if not has_override:
            return False

    if intent.get('category'):
        return True

    if _contains_any(text, FURNITURE_KEYWORDS):
        return True

    if intent.get('search_keywords') and _contains_any(
        ' '.join(intent['search_keywords']).lower(), FURNITURE_KEYWORDS
    ):
        return True

    has_room = _contains_any(text, ROOM_CONTEXT_KEYWORDS)
    has_shop = _contains_any(text, SHOPPING_INTENT_KEYWORDS)
    has_budget = (
        intent.get('max_price') is not None
        or intent.get('sort_by')
        or intent.get('budget_tier')
    )
    has_style_or_color = bool(intent.get('style') or intent.get('color_keywords'))

    if has_room and (has_shop or has_budget or has_style_or_color):
        return True

    if has_budget and has_shop:
        return True

    # În chat-ul de mobilier, un buget explicit e aproape întotdeauna legat de cumpărături mobilă
    if intent.get('max_price') is not None:
        return True

    if intent.get('decor_suggestion') and _contains_any(text, ROOM_CONTEXT_KEYWORDS + ['decor']):
        return True

    # Off-topic clar fără semnal mobilier
    if _contains_any(text, OFF_TOPIC_KEYWORDS):
        if not (_contains_any(text, FURNITURE_KEYWORDS) or intent.get('category')):
            return False

    if llm_flag is True:
        return True

    return False
