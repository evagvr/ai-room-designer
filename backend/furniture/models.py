from django.db import models


class FurnitureProduct(models.Model):
    CATEGORY_CHOICES = [
        ('seating', 'Seating'),
        ('storage', 'Storage'),
        ('table', 'Table'),
        ('bed', 'Bed'),
        ('lighting', 'Lighting'),
        ('decor', 'Decor'),
    ]

    STYLE_CHOICES = [
        ('modern', 'Modern'),
        ('scandinavian', 'Scandinavian'),
        ('industrial', 'Industrial'),
        ('minimalist', 'Minimalist'),
        ('classic', 'Classic'),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    store = models.CharField(max_length=100)
    url = models.URLField(max_length=500)
    image_url = models.CharField(
        max_length=1000,
        blank=True,
        null=True,
        help_text='Cale locală (images/pat_1.jpg) sau URL extern',
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    style = models.CharField(max_length=50, choices=STYLE_CHOICES)
    color_hex = models.CharField(max_length=7)
    color_name = models.CharField(max_length=100)
    width = models.DecimalField(max_digits=5, decimal_places=2, help_text='Lățime în metri')
    depth = models.DecimalField(max_digits=5, decimal_places=2, help_text='Adâncime în metri')
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text='Înălțime în metri')
    description = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Produs mobilier'
        verbose_name_plural = 'Produse mobilier'

    def __str__(self):
        return f'{self.name} ({self.store})'
