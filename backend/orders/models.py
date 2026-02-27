from django.db import models
from django.conf import settings
from products.models import Product

from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()

class Order(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    consumer = models.ForeignKey(User, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(max_length=20, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product_name} - {self.consumer.username}"