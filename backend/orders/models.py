from django.db import models
from django.conf import settings
from products.models import Product

class Order(models.Model):
    consumer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    total_price = models.FloatField()
    status = models.CharField(max_length=50, default='Pending')

    def __str__(self):
        return f"Order {self.id}"