"""Actualizează image_url din custom_products.json în baza de date."""

import json
import os

from django.conf import settings
from django.core.management.base import BaseCommand

from furniture.image_utils import normalize_image_url
from furniture.models import FurnitureProduct


class Command(BaseCommand):
    help = 'Sincronizează căile imaginilor din custom_products.json cu produsele din DB'

    def handle(self, *args, **options):
        path = os.path.join(settings.BASE_DIR, 'furniture', 'custom_products.json')
        if not os.path.exists(path):
            self.stdout.write(self.style.ERROR('Lipsește custom_products.json'))
            return

        with open(path, encoding='utf-8') as f:
            products = json.load(f)

        updated = 0
        for item in products:
            name = item.get('name')
            store = item.get('store')
            raw = item.get('image_url')
            if not name or not store or not raw:
                continue
            normalized = normalize_image_url(raw)
            count = FurnitureProduct.objects.filter(name=name, store=store).update(
                image_url=normalized or raw,
            )
            if count:
                updated += count

        self.stdout.write(self.style.SUCCESS(f'Actualizate {updated} imagini din catalog.'))
