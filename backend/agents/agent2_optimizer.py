import logging
import math

from furniture.dimensions import normalize_product_dimensions

logger = logging.getLogger(__name__)

MIN_GAP = 0.05
ROOM_MARGIN = 0.1
SCAN_STEP = 0.05

CATEGORY_PLACE_ORDER = {
    'bed': 0,
    'seating': 1,
    'table': 2,
    'storage': 3,
    'lighting': 4,
    'decor': 5,
}


def _f(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _prepare_items(items: list) -> list:
    return [normalize_product_dimensions({**it}) for it in items]


def _effective_dims(item: dict, rotation: int) -> tuple[float, float]:
    rot = int(rotation or 0)
    w = _f(item.get('width'), 1.0)
    d = _f(item.get('depth'), 0.8)
    if rot == 90:
        return d, w
    return w, d


def _item_area(item: dict) -> float:
    w, d = _effective_dims(item, 0)
    return w * d


def _rects_overlap(ax, ay, aw, ad, bx, by, bw, bd, gap: float) -> bool:
    return not (
        ax + aw + gap <= bx
        or bx + bw + gap <= ax
        or ay + ad + gap <= by
        or by + bd + gap <= ay
    )


def _collides(x, y, w, d, others: list, gap: float = MIN_GAP) -> bool:
    for p in others:
        pw, pd = _effective_dims(p, p.get('rotation', 0))
        if _rects_overlap(x, y, w, d, p['x'], p['y'], pw, pd, gap):
            return True
    return False


def _fits_in_room(x, y, w, d, room: dict) -> bool:
    rl = _f(room['length'], 5)
    rw = _f(room['width'], 4)
    return (ROOM_MARGIN - 1e-5) <= x and (ROOM_MARGIN - 1e-5) <= y and (x + w) <= (rl - ROOM_MARGIN + 1e-5) and (y + d) <= (rw - ROOM_MARGIN + 1e-5)


def _sort_items(items: list, variant: int, optimizer_hints: dict = None) -> list:
    pref_seq = optimizer_hints.get('preferred_sequence', []) if optimizer_hints else []
    priority_map = {cat: idx for idx, cat in enumerate(pref_seq)}

    def key(it):
        cat = it.get('category') or 'decor'
        pref_idx = priority_map.get(cat, CATEGORY_PLACE_ORDER.get(cat, 9) + len(pref_seq))
        return (pref_idx, -_item_area(it))

    ordered = sorted(items, key=key)
    if variant % 2 == 1:
        ordered = list(reversed(ordered))
    return ordered


def _frange(start: float, stop: float, step: float) -> list[float]:
    values = []
    v = start
    while v <= stop + 1e-9:
        values.append(round(v, 3))
        v += step
    return values


def _collect_candidate_positions(w: float, d: float, placed: list, room: dict, variant: int, gap: float = MIN_GAP) -> list[tuple[float, float]]:
    rl = _f(room['length'], 5)
    rw = _f(room['width'], 4)

    candidates = []
    for y in _frange(ROOM_MARGIN, rw - d - ROOM_MARGIN, SCAN_STEP):
        for x in _frange(ROOM_MARGIN, rl - w - ROOM_MARGIN, SCAN_STEP):
            candidates.append((x, y))

    for p in placed:
        pw, pd = _effective_dims(p, p.get('rotation', 0))
        px, py = _f(p['x']), _f(p['y'])
        anchors = [
            (px + pw + gap, py),
            (px, py + pd + gap),
            (px - w - gap, py),
            (px, py - d - gap),
            (px + pw + gap, py + pd + gap),
            (px - w - gap, py - d - gap),
            (rl - w - ROOM_MARGIN, py),
            (px, rw - d - ROOM_MARGIN),
        ]
        for ax, ay in anchors:
            ax_r = round(max(ROOM_MARGIN, min(ax, rl - w - ROOM_MARGIN)), 3)
            ay_r = round(max(ROOM_MARGIN, min(ay, rw - d - ROOM_MARGIN)), 3)
            candidates.append((ax_r, ay_r))

    unique_candidates = list(set(candidates))

    if variant % 3 == 1:
        unique_candidates.sort(key=lambda c: (c[1], c[0]))
    elif variant % 3 == 2:
        unique_candidates.sort(key=lambda c: (c[0], c[1]))
    else:
        unique_candidates.sort(key=lambda c: (-c[1], c[0]))

    return unique_candidates


def _score_free_position(x: float, y: float, w: float, d: float, placed: list, room: dict, item: dict, variant: int, optimizer_hints: dict = None) -> float:
    rl = _f(room['length'], 5)
    rw = _f(room['width'], 4)
    cx = x + w / 2
    cy = y + d / 2
    score = 0.0

    if placed:
        dists = []
        for p in placed:
            pw, pd = _effective_dims(p, p.get('rotation', 0))
            pcx = _f(p['x']) + pw / 2
            pcy = _f(p['y']) + pd / 2
            dists.append(math.hypot(cx - pcx, cy - pcy))

        min_dist = min(dists)
        score -= 1.0 / (min_dist + 0.1) * 2.0
        score += (sum(dists) / len(dists)) * 0.5
    else:
        score += 10.0

    cat = item.get('category')
    if cat == 'bed':
        dist_top = y - ROOM_MARGIN
        dist_bottom = (rw - ROOM_MARGIN - d) - y
        score += 20.0 - min(dist_top, dist_bottom) * 10.0

    bias_type = variant % 8
    
    # Distance to walls
    dist_left = x - ROOM_MARGIN
    dist_right = (rl - ROOM_MARGIN - w) - x
    dist_top = y - ROOM_MARGIN
    dist_bottom = (rw - ROOM_MARGIN - d) - y
    min_dist_wall = min(max(0.0, dist_left), max(0.0, dist_right), max(0.0, dist_top), max(0.0, dist_bottom))

    # Aplica hints de la Mistral
    if optimizer_hints:
        wall_cats = optimizer_hints.get('wall_bound_categories', [])
        center_cats = optimizer_hints.get('center_bound_categories', [])
        pairings = optimizer_hints.get('pairings', [])

        # Categorii lipite de perete
        if cat in wall_cats:
            score -= min_dist_wall * 5.0

        # Categorii centrate
        if cat in center_cats:
            cx_room = rl / 2
            cy_room = rw / 2
            dist_to_center = math.hypot(cx - cx_room, cy - cy_room)
            score -= dist_to_center * 5.0

        # Perechi de elemente (ex: lampă lângă canapea)
        for pair in pairings:
            a = pair.get('a')
            b = pair.get('b')
            if cat == a:
                for p in placed:
                    if p.get('category') == b:
                        pw, pd = _effective_dims(p, p.get('rotation', 0))
                        pcx = _f(p['x']) + pw / 2
                        pcy = _f(p['y']) + pd / 2
                        d_pair = math.hypot(cx - pcx, cy - pcy)
                        score += 8.0 / (d_pair + 0.1)
            elif cat == b:
                for p in placed:
                    if p.get('category') == a:
                        pw, pd = _effective_dims(p, p.get('rotation', 0))
                        pcx = _f(p['x']) + pw / 2
                        pcy = _f(p['y']) + pd / 2
                        d_pair = math.hypot(cx - pcx, cy - pcy)
                        score += 8.0 / (d_pair + 0.1)

    if bias_type == 0:
        # Bias Top-Left
        score -= (x * 0.3 + y * 0.3)
    elif bias_type == 1:
        # Bias Bottom-Right
        score -= ((rl - w - x) * 0.3 + (rw - d - y) * 0.3)
    elif bias_type == 2:
        # Bias Top-Right
        score -= ((rl - w - x) * 0.3 + y * 0.3)
    elif bias_type == 3:
        # Bias Bottom-Left
        score -= (x * 0.3 + (rw - d - y) * 0.3)
    elif bias_type == 4:
        # Spaced-out / Distribute-wide
        pass
    elif bias_type == 5:
        # Perimeter / Wall-bound
        cat_name = item.get('category', '')
        item_name = item.get('name', '').lower()
        if cat_name != 'table' or 'cafe' not in item_name:
            score -= min_dist_wall * 1.5
    elif bias_type == 6:
        # Alternating corners
        idx = len(placed)
        if idx % 2 == 0:
            score -= (x * 0.3 + y * 0.3)
        else:
            score -= ((rl - w - x) * 0.3 + (rw - d - y) * 0.3)
    elif bias_type == 7:
        # Center-focused
        cx_room = rl / 2
        cy_room = rw / 2
        score -= math.hypot(cx - cx_room, cy - cy_room) * 0.4

    return score


def _find_best_position(item: dict, placed: list, room: dict, variant: int, force_gap: float = MIN_GAP, optimizer_hints: dict = None) -> dict | None:
    best_entry = None
    best_score = -1e18

    rotations = (0, 90) if variant % 2 == 0 else (90, 0)

    for rotation in rotations:
        w, d = _effective_dims(item, rotation)
        candidates = _collect_candidate_positions(w, d, placed, room, variant, force_gap)

        for x, y in candidates:
            if not _fits_in_room(x, y, w, d, room):
                continue
            if _collides(x, y, w, d, placed, force_gap):
                continue

            s = _score_free_position(x, y, w, d, placed, room, item, variant, optimizer_hints)
            if s > best_score:
                best_score = s
                best_entry = {
                    **item,
                    'x': x,
                    'y': y,
                    'rotation': rotation,
                    'reasoning': 'Spațiu liber optim',
                }

    return best_entry


def _pack_spatial_free(items: list, room: dict, variant: int = 0, force_gap: float = MIN_GAP, optimizer_hints: dict = None) -> list:
    placed: list[dict] = []
    rl = _f(room['length'], 5)
    rw = _f(room['width'], 4)

    for idx, item in enumerate(_sort_items(items, variant, optimizer_hints)):
        entry = _find_best_position(item, placed, room, variant, force_gap, optimizer_hints)

        if not entry:
            entry = _find_best_position(item, placed, room, variant, 0.01, optimizer_hints)

        if not entry:
            w, d = _effective_dims(item, 0)
            found_fallback = False
            for gy in _frange(ROOM_MARGIN, rw - d - ROOM_MARGIN, 0.1):
                for gx in _frange(ROOM_MARGIN, rl - w - ROOM_MARGIN, 0.1):
                    if not _collides(gx, gy, w, d, placed, 0.005):
                        entry = {
                            **item,
                            'x': gx,
                            'y': gy,
                            'rotation': 0,
                            'reasoning': 'Grilă Salvare',
                        }
                        found_fallback = True
                        break
                if found_fallback:
                    break

        if not entry:
            w, d = _effective_dims(item, 0)
            offset_x = (idx * 0.35) % max(0.1, rl - w - 2 * ROOM_MARGIN)
            offset_y = (idx * 0.25) % max(0.1, rw - d - 2 * ROOM_MARGIN)
            entry = {
                **item,
                'x': round(ROOM_MARGIN + offset_x, 3),
                'y': round(ROOM_MARGIN + offset_y, 3),
                'rotation': 0,
                'reasoning': 'Forțat distribuit',
            }

        placed.append(entry)

    return placed


def _finalize_layout(layout: list, room: dict, force_gap: float = MIN_GAP, optimizer_hints: dict = None) -> list:
    seen = set()
    unique = []
    for item in layout:
        iid = item.get('id')
        if iid in seen:
            continue
        seen.add(iid)
        unique.append(item)

    rl = _f(room['length'], 5)
    rw = _f(room['width'], 4)

    for pass_idx in range(len(unique) * 10):
        bad = set(check_collisions(unique))
        if not bad:
            break

        for idx, item in enumerate(unique):
            if item['id'] not in bad:
                continue
            others = [p for j, p in enumerate(unique) if j != idx]

            moved = _find_best_position(item, others, room, pass_idx, 0.01, optimizer_hints)
            if not moved:
                moved = _find_best_position(item, others, room, pass_idx + 1, 0.0, optimizer_hints)

            if not moved:
                w, d = _effective_dims(item, item.get('rotation', 0))
                found_escape = False
                for step_y in _frange(ROOM_MARGIN, rw - d - ROOM_MARGIN, 0.1):
                    for step_x in _frange(ROOM_MARGIN, rl - w - ROOM_MARGIN, 0.1):
                        if not _collides(step_x, step_y, w, d, others, 0.001):
                            moved = {
                                **item,
                                'x': step_x,
                                'y': step_y,
                                'reasoning': 'Evadare Coliziune'
                            }
                            found_escape = True
                            break
                    if found_escape:
                        break

            if moved:
                unique[idx] = moved

    return unique


def run_agent2(room, selected_items, variant=0):
    room_f = {
        'length': _f(room.get('length'), 5),
        'width': _f(room.get('width'), 4),
        'height': _f(room.get('height'), 2.7),
    }
    items = _prepare_items(selected_items)
    if not items:
        return []

    # Import singleton-ul Ollama
    from .ollama_service import ollama

    # Determinăm datele contextuale ale camerei
    room_type = "living_room"
    if any(it.get('category') == 'bed' for it in items):
        room_type = "bedroom"
    elif any('birou' in it.get('name', '').lower() for it in items):
        room_type = "office"

    detected_style = items[0].get('style', 'modern') if items else 'modern'
    windows = room.get('windows', [{'wall': 'North', 'width': 1.5, 'position': 2.0}])
    doors = room.get('doors', [{'wall': 'South', 'width': 0.9, 'position': 0.5}])

    layout_recommendations = None
    try:
        SYSTEM_PROMPT = (
            "Ești un asistent AI expert în design interior și optimizare spațială.\n"
            "Analizează specificațiile camerei, mobilierul disponibil și locația ușilor/ferestrelor pentru a sugera o strategie de amenajare.\n"
            "Trebuie să returnezi EXCLUSIV un obiect JSON valid, fără alte explicații sau text introductiv/concluziv.\n\n"
            "Structura JSON-ului returnat trebuie să fie exact următoarea:\n"
            "{\n"
            "  \"design_strategy\": \"strategie descrisă pe scurt (ex: maximize natural light)\",\n"
            "  \"focal_point\": \"seating\" sau \"bed\" sau \"table\" sau \"storage\",\n"
            "  \"placement_rules\": [\n"
            "    \"place sofa facing TV\",\n"
            "    \"keep walking path clear\",\n"
            "    \"place lamp near sofa\"\n"
            "  ],\n"
            "  \"style_consistency\": [\n"
            "    \"use wood accents\",\n"
            "    \"maintain neutral palette\"\n"
            "  ],\n"
            "  \"optimizer_hints\": {\n"
            "    \"preferred_sequence\": [\"bed\", \"seating\", \"table\", \"storage\", \"lighting\", \"decor\"],\n"
            "    \"wall_bound_categories\": [\"bed\", \"storage\"],\n"
            "    \"center_bound_categories\": [\"table\"],\n"
            "    \"spacing_factor\": 1.2,\n"
            "    \"pairings\": [\n"
            "      {\"a\": \"lighting\", \"b\": \"seating\"},\n"
            "      {\"a\": \"table\", \"b\": \"seating\"}\n"
            "    ]\n"
            "  }\n"
            "}\n"
        )

        user_prompt = (
            f"Specificații Cameră:\n"
            f"- Dimensiuni: {room_f['length']}m lungime x {room_f['width']}m lățime x {room_f['height']}m înălțime\n"
            f"- Tip Cameră: {room_type}\n"
            f"- Stil Detectat: {detected_style}\n"
            f"- Poziție Ferestre: {windows}\n"
            f"- Poziție Uși: {doors}\n\n"
            f"Mobilier de plasat:\n"
        )
        for it in items:
            user_prompt += f"- {it.get('name')} (Categorie: {it.get('category')}, Dimensiuni: {it.get('width')}x{it.get('depth')}m)\n"

        user_prompt += "\nGenerează strategia de design și hints pentru optimizator sub forma JSON specificată."

        raw_response = ollama.chat(SYSTEM_PROMPT, user_prompt, temperature=0.1)
        layout_recommendations = ollama.extract_json(raw_response)
        logger.info(f"[Agent 2 Mistral Recommendations] {layout_recommendations}")
    except Exception as e:
        logger.warning(f"Apelul Mistral în Agent 2 a eșuat sau a expirat: {e}. Folosim fallback determinist.")

    optimizer_hints = None
    gap_factor = 1.0
    if layout_recommendations:
        optimizer_hints = layout_recommendations.get('optimizer_hints', {})
        try:
            gap_factor = float(optimizer_hints.get('spacing_factor', 1.0))
        except (ValueError, TypeError):
            pass

    gap = MIN_GAP * gap_factor

    # Generăm layout-ul aplicând hints-urile de la Mistral
    layout = _finalize_layout(_pack_spatial_free(items, room_f, variant, gap, optimizer_hints), room_f, gap, optimizer_hints)
    return layout


def _layout_spread_score(layout: list, room: dict) -> float:
    if len(layout) < 2:
        return 1.0
    rl = _f(room['length'], 5)
    rw = _f(room['width'], 4)
    ys = [_f(i['y']) for i in layout]
    xs = [_f(i['x']) for i in layout]
    y_span = max(ys) - min(ys)
    x_span = max(xs) - min(xs)
    return (y_span / max(rw, 0.1)) + (x_span / max(rl, 0.1))


def check_collisions(layout):
    collisions = set()
    for i in range(len(layout)):
        for j in range(i + 1, len(layout)):
            a, b = layout[i], layout[j]
            aw, ad = _effective_dims(a, a.get('rotation', 0))
            bw, bd = _effective_dims(b, b.get('rotation', 0))
            if _rects_overlap(a['x'], a['y'], aw, ad, b['x'], b['y'], bw, bd, 0.001):
                collisions.add(a['id'])
                collisions.add(b['id'])
    return list(collisions)