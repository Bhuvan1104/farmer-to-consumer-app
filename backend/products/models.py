from django.db import models
from django.conf import settings

class Product(models.Model):
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    price = models.FloatField()
    quantity = models.IntegerField()
    image = models.ImageField(upload_to='products/')
    freshness_score = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name