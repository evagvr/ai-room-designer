"""Convertește dimensiunile în cm din DB la metri."""

from django.core.management.base import BaseCommand

from furniture.dimensions import normalize_dimension_meters
from furniture.models import FurnitureProduct


class Command(BaseCommand):
    help = 'Normalizează width/depth/height (cm → m) pentru toate produsele din DB'

    def handle(self, *args, **options):
        updated = 0
        for p in FurnitureProduct.objects.all():
            nw = normalize_dimension_meters(p.width, 1.0)
            nd = normalize_dimension_meters(p.depth, 0.8)
            nh = normalize_dimension_meters(p.height, 1.0)
            if nw != float(p.width) or nd != float(p.depth) or nh != float(p.height):
                p.width = nw
                p.depth = nd
                p.height = nh
                p.save(update_fields=['width', 'depth', 'height'])
                updated += 1
        self.stdout.write(self.style.SUCCESS(f'Actualizate {updated} produse.'))
