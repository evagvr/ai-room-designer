import os
import json
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from furniture.dimensions import normalize_dimension_meters
from furniture.image_utils import normalize_image_url
from furniture.models import FurnitureProduct

class Command(BaseCommand):
    help = 'Încarcă catalogul de mobilier din custom_products.json (singura sursă de produse)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Șterge toate produsele existente din baza de date înainte de a le încărca pe cele noi',
        )

    def handle(self, *args, **options):
        import glob
        from django.conf import settings

        # Găsim fișierul principal și orice fișier de tip custom_products_*.json (pentru colaborare)
        files = glob.glob(os.path.join(settings.BASE_DIR, 'furniture', 'custom_products_*.json'))
        main_path = os.path.join(settings.BASE_DIR, 'furniture', 'custom_products.json')
        if os.path.exists(main_path):
            files.append(main_path)

        if not files:
            self.stdout.write(self.style.ERROR(
                f"Nu s-a găsit niciun fișier 'custom_products.json' sau 'custom_products_*.json' în folderul furniture!"
            ))
            return

        products_list = []
        for file_path in files:
            self.stdout.write(f"Se încarcă produse din: {os.path.basename(file_path)}...")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        products_list.extend(data)
                    else:
                        self.stdout.write(self.style.WARNING(f"  - Fișierul {os.path.basename(file_path)} nu conține o listă validă! Sărit."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  - Eroare la citirea fișierului {os.path.basename(file_path)}: {e}"))

        if not products_list:
            self.stdout.write(self.style.ERROR("Nu s-a găsit niciun produs valid de încărcat!"))
            return

        if options['clear']:
            deleted, _ = FurnitureProduct.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Șterse {deleted} produse existente din baza de date."))

        created_count = 0
        updated_count = 0

        for idx, item in enumerate(products_list):
            name = item.get('name')
            store = item.get('store')
            
            if not name or not store:
                self.stdout.write(self.style.ERROR(f"Produsul de la indexul {idx} nu are 'name' sau 'store'! A fost sărit."))
                continue

            def safe_decimal(val, default):
                if val is None or str(val).strip() == '' or str(val).strip().lower() == 'none':
                    return Decimal(str(default))
                try:
                    return Decimal(str(val))
                except Exception:
                    return Decimal(str(default))

            try:
                # Conversie decimală în siguranță pentru preț și dimensiuni
                raw_image = item.get('image_url', '') or ''
                defaults = {
                    'category': item.get('category', 'seating'),
                    'url': item.get('url', ''),
                    'image_url': normalize_image_url(raw_image) or raw_image or '',
                    'price': safe_decimal(item.get('price'), 0.0),
                    'style': item.get('style', 'modern'),
                    'color_hex': item.get('color_hex', '#888888'),
                    'color_name': item.get('color_name', 'Neutru'),
                    'width': safe_decimal(
                        normalize_dimension_meters(item.get('width'), 1.0), 1.0
                    ),
                    'depth': safe_decimal(
                        normalize_dimension_meters(item.get('depth'), 0.8), 0.8
                    ),
                    'height': safe_decimal(
                        normalize_dimension_meters(item.get('height'), 1.0), 1.0
                    ),
                    'description': item.get('description', ''),
                }

                product, created = FurnitureProduct.objects.update_or_create(
                    name=name,
                    store=store,
                    defaults=defaults
                )

                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f"  + Adăugat: {product.name} ({product.store})"))
                else:
                    updated_count += 1
                    self.stdout.write(f"  ~ Actualizat: {product.name} ({product.store})")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Eroare la procesarea produsului '{name}': {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"\nImport finalizat! Am creat {created_count} produse noi și am actualizat {updated_count} existente. "
            f"Total în baza de date: {FurnitureProduct.objects.count()} produse."
        ))
