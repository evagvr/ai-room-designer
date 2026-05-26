"""Normalizează URL-urile imaginilor din catalog pentru servirea din public/images/."""


def normalize_image_url(url: str | None) -> str | None:
    if not url:
        return url
    url = str(url).strip()
    if url.startswith('images/'):
        return f'/{url}'
    return url
