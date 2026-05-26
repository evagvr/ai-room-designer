"""Normalizare dimensiuni catalog: cm → metri pentru plan cameră."""


def normalize_dimension_meters(value, default: float = 1.0) -> float:
    """
    Valori > 10 sunt tratate ca centimetri (ex. 180 → 1.8 m).
    Valori ≤ 10 sunt deja în metri (ex. 1.05, 2.0).
    """
    try:
        v = float(value)
    except (TypeError, ValueError):
        return default
    if v <= 0:
        return default
    if v > 10:
        return round(v / 100.0, 3)
    return round(v, 3)


def normalize_product_dimensions(product: dict) -> dict:
    """Returnează copie cu width/depth/height în metri."""
    out = dict(product)
    out['width'] = normalize_dimension_meters(out.get('width'), 1.0)
    out['depth'] = normalize_dimension_meters(out.get('depth'), 0.8)
    if out.get('height') is not None:
        out['height'] = normalize_dimension_meters(out.get('height'), 1.0)
    return out
