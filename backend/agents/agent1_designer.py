"""
Agent 1 — Designer: filtrează mobilier din DB după stil, buget și dimensiuni cameră.
"""
import random
import logging
from furniture.models import FurnitureProduct
from furniture.serializers import FurnitureProductSerializer
from .ollama_service import ollama

logger = logging.getLogger(__name__)

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
    - stil (analizat de Mistral cu fallback determinist)
    - buget maxim (analizat de Mistral / UI)
    - dimensiuni cameră (piesa trebuie să încapă)
    Scorarea candidaților este influențată activ de modelul Mistral.
    """
    rl = float(room.get('length', 5))
    rw = float(room.get('width', 4))

    # Apel către Mistral pentru interpretarea intenției utilizatorului
    intent = None
    if user_query or style or palettes:
        SYSTEM_PROMPT = (
            "Ești un asistent AI specializat în design interior. Rolul tău este să analizezi cerințele utilizatorului și filtrele selectate pentru a clasifica intenția de amenajare.\n"
            "Trebuie să returnezi EXCLUSIV un obiect JSON valid, fără alte explicații sau text introductiv/concluziv.\n\n"
            "Categoriile de produse disponibile în aplicație sunt: [\"seating\", \"storage\", \"table\", \"bed\", \"lighting\", \"decor\"]\n"
            "Stilurile disponibile în aplicație sunt: [\"modern\", \"scandinavian\", \"industrial\", \"minimalist\", \"classic\"]\n\n"
            "Structura JSON-ului returnat trebuie să fie exact următoarea:\n"
            "{\n"
            "  \"room_type\": \"living_room\" sau \"bedroom\" sau \"office\" sau \"dining_room\" sau \"hallway\" sau \"other\",\n"
            "  \"styles\": [\"stil1\", \"stil2\"], # Selectate din stilurile disponibile de mai sus, în ordinea relevanței\n"
            "  \"colors\": [\"culoare1\", \"culoare2\"], # Culori deduse sau selectate, traduse în română (ex: \"alb\", \"gri\", \"bej\", \"negru\", \"lemn\", \"maro\")\n"
            "  \"attributes\": [\"cozy\", \"bright\", \"elegant\", \"rustic\", \"minimalist\", \"industrial\", \"classic\"], # Atribute de stil/atmosferă\n"
            "  \"priority_products\": [\"canapea\", \"masuta\", \"lampa\", \"dulap\", \"pat\", \"covor\"], # Produse prioritare deduse din query în limba română (folosind cuvinte la singular)\n"
            "  \"budget_estimation\": 1500 # Bugetul detectat dacă utilizatorul a menționat o sumă în text (număr), altfel null\n"
            "}\n"
        )

        user_prompt = (
            f"Prompt utilizator original: \"{user_query or ''}\"\n"
            f"Filtre selectate în interfață:\n"
            f"- Stil de design: {style}\n"
            f"- Palete de culori: {', '.join(palettes) if palettes else 'nespecificat'}\n"
            f"- Buget maxim: {max_budget or 'nespecificat'}\n\n"
            "Construiește intenția structurată bazată pe acești parametri."
        )

        try:
            raw_response = ollama.chat(SYSTEM_PROMPT, user_prompt, temperature=0.1)
            intent = ollama.extract_json(raw_response)
            logger.info(f"[Agent 1 Mistral Intent] {intent}")
        except Exception as e:
            logger.warning(f"Apelul Mistral în Agent 1 a eșuat sau a expirat: {e}. Folosim fallback determinist.")

    # Prelucrare filtre pe baza răspunsului Mistral (sau fallback la filtrele UI)
    if intent:
        extracted_styles = intent.get('styles', [])
        valid_styles = [s for s in extracted_styles if s in ['modern', 'scandinavian', 'industrial', 'minimalist', 'classic']]
        if not valid_styles:
            valid_styles = STYLE_COMPAT.get(style, [style, 'modern'])
        
        est_budget = intent.get('budget_estimation')
        if est_budget:
            try:
                max_budget = float(est_budget)
            except (ValueError, TypeError):
                pass
        
        colors = intent.get('colors', []) or palettes
        attributes = intent.get('attributes', [])
        priority_products = intent.get('priority_products', [])
    else:
        valid_styles = STYLE_COMPAT.get(style, [style, 'modern'])
        colors = palettes
        attributes = []
        priority_products = []

    # Interogare bază de date
    qs = FurnitureProduct.objects.all()

    # Filtrare după buget
    if max_budget:
        try:
            qs = qs.filter(price__lte=float(max_budget))
        except (ValueError, TypeError):
            pass

    # Filtrare după dimensiuni camerei (piesa trebuie să încapă cu 15% margine)
    qs = qs.filter(width__lt=rl * 0.85, depth__lt=rw * 0.85)

    # Filtrare stil
    styled_qs = qs.filter(style__in=valid_styles)
    if styled_qs.count() < 3:
        styled_qs = qs

    # Scorare produse folosind datele de la Mistral
    scored_products = []
    for item in styled_qs:
        score = 0.0

        # Potrivire stil (stilurile returnate primele au pondere mai mare)
        if item.style in valid_styles:
            score += (10.0 - valid_styles.index(item.style) * 2.0)

        # Potrivire culori
        for c in colors:
            c_lower = c.lower()
            if c_lower in item.color_name.lower() or c_lower in item.name.lower() or c_lower in item.description.lower():
                score += 5.0

        # Potrivire atribute de design
        for attr in attributes:
            attr_lower = attr.lower()
            if attr_lower in item.name.lower() or attr_lower in item.description.lower():
                score += 3.0

        # Potrivire priority products (cuvinte cheie menționate de Mistral)
        for p_prod in priority_products:
            p_lower = p_prod.lower()
            if p_lower in item.name.lower() or p_lower in item.description.lower():
                score += 8.0

        scored_products.append((score, item))

    # Reordonare categorii în funcție de prioritățile Mistral
    category_priority = {}
    for p_prod in priority_products:
        p_lower = p_prod.lower()
        if any(w in p_lower for w in ["canapea", "scaun", "fotoliu", "seating"]):
            category_priority['seating'] = 10
        if any(w in p_lower for w in ["comoda", "biblioteca", "dulap", "raft", "storage", "noptiera"]):
            category_priority['storage'] = 10
        if any(w in p_lower for w in ["masuta", "masa", "birou", "table"]):
            category_priority['table'] = 10
        if any(w in p_lower for w in ["pat", "bed"]):
            category_priority['bed'] = 10
        if any(w in p_lower for w in ["lampa", "lustra", "veioza", "lighting", "lumina"]):
            category_priority['lighting'] = 10
        if any(w in p_lower for w in ["tablou", "decor", "oglinda", "covor", "perna"]):
            category_priority['decor'] = 10

    categories = ['seating', 'storage', 'table', 'bed', 'lighting', 'decor']
    categories.sort(key=lambda c: category_priority.get(c, 0), reverse=True)

    result = []
    # Alegem cel mai potrivit produs din fiecare categorie
    for cat in categories:
        cat_scored = [
            (score + random.uniform(0, 0.5), item)
            for score, item in scored_products
            if item.category == cat
        ]
        if cat_scored:
            cat_scored.sort(key=lambda x: x[0], reverse=True)
            result.append(cat_scored[0][1])
        if len(result) >= 8:
            break

    # Completăm până la 8 dacă este cazul, folosind restul produselor sortate după scor
    if len(result) < 8:
        existing_ids = [p.id for p in result]
        remaining_scored = [
            (score + random.uniform(0, 0.5), item)
            for score, item in scored_products
            if item.id not in existing_ids
        ]
        remaining_scored.sort(key=lambda x: x[0], reverse=True)
        for _, item in remaining_scored:
            result.append(item)
            if len(result) >= 8:
                break

    serializer = FurnitureProductSerializer(result, many=True)
    return serializer.data

