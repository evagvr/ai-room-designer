"""
Populează baza de date exclusiv din custom_products.json.
Alias pentru load_custom_products (compatibilitate comenzi vechi).
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Încarcă catalogul din custom_products.json (singura sursă de produse)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Șterge toate produsele existente înainte de import',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.NOTICE(
                'Catalog: doar custom_products.json (fără catalog_extra / produse generate).'
            )
        )
        call_command('load_custom_products', clear=options['clear'])
