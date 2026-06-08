import json
import re
import logging
import urllib.error
import urllib.request
from urllib.parse import urljoin
from django.conf import settings

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = 180  # mărit de la 120 → 180s pentru modele mai lente

    def _post(self, endpoint: str, payload: dict) -> dict:
        url = urljoin(self.base_url.rstrip('/') + '/', endpoint.lstrip('/'))
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.URLError as e:
            raise ConnectionError(
                f"Nu pot conecta la Ollama ({self.base_url}). "
                f"Asigură-te că rulează: `ollama serve`. Detalii: {e}"
            )

    def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        """Apel simplu chat către Ollama — returnează textul răspunsului."""
        payload = {
            'model': self.model,
            'stream': False,
            'options': {
                'num_predict': 2048,   # ← FIX: previne trunchierea JSON-ului
                'temperature': temperature,
            },
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user',   'content': user_prompt},
            ],
        }
        response = self._post('/api/chat', payload)
        raw = response['message']['content']
        logger.debug(f"[Ollama] Răspuns ({len(raw)} chars): {raw[:300]}")
        return raw

    def extract_json(self, text: str):
        """
        Extrage JSON din răspunsul modelului, tolerant la markdown fences
        și la text suplimentar înainte/după JSON.
        """
        # Scoate markdown code fences
        clean = re.sub(r'```(?:json)?', '', text).strip()
        clean = re.sub(r'```', '', clean).strip()

        # Încearcă direct
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass

        # Caută primul array JSON complet din text
        # Folosim un parser simplu de paranteze pentru a găsi JSON-ul complet
        for start_char, end_char, pattern in [('[', ']', r'\['), ('{', '}', r'\{')]:
            start_idx = clean.find(start_char)
            if start_idx == -1:
                continue
            # Numără parantezele pentru a găsi sfârșitul corect
            depth = 0
            end_idx = -1
            in_string = False
            escape_next = False
            for i, ch in enumerate(clean[start_idx:], start_idx):
                if escape_next:
                    escape_next = False
                    continue
                if ch == '\\' and in_string:
                    escape_next = True
                    continue
                if ch == '"' and not escape_next:
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch == start_char:
                    depth += 1
                elif ch == end_char:
                    depth -= 1
                    if depth == 0:
                        end_idx = i + 1
                        break

            if end_idx != -1:
                candidate = clean[start_idx:end_idx]
                try:
                    result = json.loads(candidate)
                    logger.debug(f"[Ollama] JSON extras cu succes: {type(result)}")
                    return result
                except json.JSONDecodeError as e:
                    logger.warning(f"[Ollama] JSON invalid la parsare: {e}. Candidate: {candidate[:200]}")
                    continue

        raise ValueError(f"Nu s-a putut extrage JSON valid din: {text[:500]}")


# Singleton — importat de views
ollama = OllamaService()
