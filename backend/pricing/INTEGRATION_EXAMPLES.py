"""
Practical Integration Examples for Dynamic Pricing

Shows how to integrate dynamic pricing into:
1. Product model and serializers
2. Farmer workflows
3. Real-time price updates
4. Admin dashboard
"""

# ============================================================================
# EXAMPLE 1: Extend Product Model with Pricing
# ============================================================================

"""
File: backend/products/models.py

Add these fields to the Product model:
"""

# NEW FIELDS TO ADD TO PRODUCT MODEL:
"""
from django.db import models
from django.utils import timezone

class Product(models.Model):
    # ... existing fields ...
    
    # Freshness and pricing fields
    freshness_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Freshness score (0-1) from image analysis"
    )
    freshness_category = models.CharField(
        max_length=20,
        choices=[
            ('Excellent', 'Excellent'),
            ('Good', 'Good'),
            ('Fair', 'Fair'),
            ('Poor', 'Poor'),
            ('Not Fresh', 'Not Fresh'),
        ],
        null=True,
        blank=True
    )
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Original cost of product"
    )
    current_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Dynamic adjusted price"
    )
    price_last_updated = models.DateTimeField(
        auto_now_add=True,
        help_text="When dynamic price was last calculated"
    )
    
    # Demand tracking
    current_demand_index = models.IntegerField(
        default=5,
        help_text="Current market demand (1-10)"
    )
    
    # Metadata
    pricing_factors = models.JSONField(
        default=dict,
        blank=True,
        help_text="Store pricing calculation details for transparency"
    )
    
    def __str__(self):
        return f"{self.name} - ${self.current_price}"
    
    def get_dynamic_price(self):
        \"\"\"Calculate and return current dynamic price.\"\"\"
        from pricing.pricing_service import DynamicPricingCalculator
        
        calculator = DynamicPricingCalculator()
        
        result = calculator.calculate_dynamic_price(
            base_price=float(self.base_price),
            freshness_score=self.freshness_score or 0.8,
            demand_index=self.current_demand_index,
        )
        
        # Store calculation details
        self.pricing_factors = {
            'freshness': result['freshness_factor'],
            'demand': result['demand_factor'],
            'seasonal': result['seasonal_factor'],
            'formula': result['calculation_formula']
        }
        self.current_price = result['suggested_price']
        self.freshness_category = result['freshness_factor']['category']
        self.price_last_updated = timezone.now()
        
        return result
"""


# ============================================================================
# EXAMPLE 2: Product Serializer with Dynamic Pricing
# ============================================================================

"""
File: backend/products/serializers.py
"""

# NEW SERIALIZER:
"""
from rest_framework import serializers
from .models import Product
from pricing.pricing_service import DynamicPricingCalculator

class ProductDetailSerializer(serializers.ModelSerializer):
    \"\"\"
    Detailed product serializer with dynamic pricing information.
    \"\"\"
    
    farmer_username = serializers.CharField(
        source='farmer.username',
        read_only=True
    )
    
    # Pricing details
    base_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    current_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    price_difference = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    
    # Freshness
    freshness_score = serializers.FloatField(read_only=True)
    freshness_category = serializers.CharField(read_only=True)
    
    # Demand
    current_demand_index = serializers.IntegerField()
    
    # Metadata
    pricing_factors = serializers.JSONField(read_only=True)
    price_last_updated = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'quantity',
            'farmer', 'farmer_username', 'image',
            'base_price', 'current_price', 'price_difference',
            'discount_percentage',
            'freshness_score', 'freshness_category',
            'current_demand_index',
            'pricing_factors', 'price_last_updated',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'farmer', 'farmer_username',
            'current_price', 'freshness_category', 'price_last_updated'
        ]
    
    def get_price_difference(self, obj):
        if obj.base_price and obj.current_price:
            return float(obj.current_price) - float(obj.base_price)
        return 0
    
    def get_discount_percentage(self, obj):
        if obj.base_price and obj.current_price:
            diff = float(obj.current_price) - float(obj.base_price)
            return round((diff / float(obj.base_price)) * 100, 2)
        return 0
"""


# ============================================================================
# EXAMPLE 3: Update Product with Dynamic Pricing
# ============================================================================

"""
File: backend/products/views.py
"""

# ADD THIS METHOD TO ProductViewSet:
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Product
from .serializers import ProductSerializer, ProductDetailSerializer
from pricing.pricing_service import DynamicPricingCalculator
from pricing.model_service import FreshnessPredictor
import tempfile
import os


class ProductViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_dynamic_price(self, request, pk=None):
        \"\"\"
        Update product's dynamic price based on current conditions.
        
        Request body:
        {
            "freshness_score": 0.85,
            "demand_index": 7,
            "season": "high"  # optional
        }
        \"\"\"
        try:
            product = self.get_object()
            
            # Check permission (owner or admin)
            if product.farmer != request.user and not request.user.is_staff:
                return Response(
                    {"error": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get inputs
            freshness_score = request.data.get('freshness_score')
            demand_index = request.data.get('demand_index')
            season = request.data.get('season', None)
            
            # Validate
            if freshness_score is None or demand_index is None:
                return Response(
                    {
                        "error": "Missing required fields",
                        "required": ["freshness_score", "demand_index"]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate dynamic price
            calculator = DynamicPricingCalculator()
            pricing = calculator.calculate_dynamic_price(
                base_price=float(product.base_price),
                freshness_score=freshness_score,
                demand_index=demand_index,
                season=season
            )
            
            # Update product
            product.freshness_score = freshness_score
            product.freshness_category = pricing['freshness_factor']['category']
            product.current_price = pricing['suggested_price']
            product.current_demand_index = demand_index
            product.pricing_factors = {
                'freshness': pricing['freshness_factor'],
                'demand': pricing['demand_factor'],
                'seasonal': pricing['seasonal_factor'],
                'explanation': pricing['explanation']
            }
            product.save()
            
            # Return updated product with pricing details
            serializer = ProductDetailSerializer(product)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def analyze_and_price(self, request, pk=None):
        \"\"\"
        Analyze product image for freshness and calculate dynamic price.
        
        Request body: multipart/form-data
        {
            "image": <image_file>,
            "demand_index": 7,
            "season": "high"  # optional
        }
        \"\"\"
        try:
            product = self.get_object()
            
            # Check permission
            if product.farmer != request.user and not request.user.is_staff:
                return Response(
                    {"error": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get image
            image_file = request.FILES.get('image')
            demand_index = request.data.get('demand_index')
            season = request.data.get('season', None)
            
            if not image_file or demand_index is None:
                return Response(
                    {
                        "error": "Missing required fields",
                        "required": ["image", "demand_index"]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save temporary image
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                for chunk in image_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            try:
                # Predict freshness
                predictor = FreshnessPredictor()
                freshness = predictor.predict(tmp_path)
                
                # Calculate dynamic price
                calculator = DynamicPricingCalculator()
                pricing = calculator.calculate_dynamic_price(
                    base_price=float(product.base_price),
                    freshness_score=freshness['freshness_score'],
                    demand_index=demand_index,
                    season=season
                )
                
                # Update product
                product.freshness_score = freshness['freshness_score']
                product.freshness_category = freshness['freshness_category']
                product.current_price = pricing['suggested_price']
                product.current_demand_index = demand_index
                product.pricing_factors = {
                    'freshness': pricing['freshness_factor'],
                    'demand': pricing['demand_factor'],
                    'seasonal': pricing['seasonal_factor'],
                    'explanation': pricing['explanation']
                }
                product.save()
                
                # Return result
                serializer = ProductDetailSerializer(product)
                return Response(
                    {
                        "product": serializer.data,
                        "freshness_analysis": freshness,
                        "pricing_calculation": pricing
                    },
                    status=status.HTTP_200_OK
                )
            
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
"""


# ============================================================================
# EXAMPLE 4: Periodic Price Updates (Task Queue - Celery)
# ============================================================================

"""
File: backend/products/tasks.py

If using Celery for background tasks:
"""

"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from products.models import Product
from pricing.pricing_service import DynamicPricingCalculator
from analytics.models import ProductAnalytics


@shared_task
def update_all_product_prices():
    \"\"\"
    Periodic task to recalculate all active product prices.
    Run every 2 hours.
    \"\"\"
    products = Product.objects.filter(status='active')
    calculator = DynamicPricingCalculator()
    updated_count = 0
    
    for product in products:
        try:
            # Calculate demand based on recent orders
            demand_index = calculate_product_demand(product)
            
            # Calculate price
            pricing = calculator.calculate_dynamic_price(
                base_price=float(product.base_price),
                freshness_score=product.freshness_score or 0.8,
                demand_index=demand_index
            )
            
            # Update product
            product.current_price = pricing['suggested_price']
            product.current_demand_index = demand_index
            product.pricing_factors = {
                'freshness': pricing['freshness_factor'],
                'demand': pricing['demand_factor'],
                'seasonal': pricing['seasonal_factor'],
            }
            product.save()
            
            # Log update
            ProductAnalytics.objects.create(
                product=product,
                action='price_updated',
                old_price=product.base_price,
                new_price=pricing['suggested_price'],
                trigger='periodic_update',
                demand_index=demand_index
            )
            
            updated_count += 1
        
        except Exception as e:
            print(f"Error updating price for {product.id}: {str(e)}")
    
    return f"Updated {updated_count} product prices"


def calculate_product_demand(product):
    \"\"\"Calculate demand index based on recent order activity.\"\"\"
    from orders.models import Order
    from django.db.models import Count
    
    # Get orders from last 24 hours
    one_day_ago = timezone.now() - timedelta(hours=24)
    recent_orders = Order.objects.filter(
        product=product,
        created_at__gte=one_day_ago
    ).count()
    
    # Map to 1-10 scale (assuming 0-50 orders per day is typical)
    demand_index = max(1, min(10, 1 + (recent_orders // 5)))
    
    return demand_index
"""


# ============================================================================
# EXAMPLE 5: API Endpoint Combined (Image + Pricing)
# ============================================================================

"""
File: backend/products/urls.py

Add this URL pattern:
"""

"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]

# Usage:
# POST /api/products/{id}/update_dynamic_price/
# POST /api/products/{id}/analyze_and_price/
"""


# ============================================================================
# EXAMPLE 6: Consumer API - Show Pricing Breakdown
# ============================================================================

"""
When consumers view products, show pricing transparency:
"""

"""
{
  "id": 1,
  "name": "Fresh Tomatoes",
  "description": "Locally grown organic tomatoes",
  "base_price": "50.00",
  "current_price": "65.00",
  "price_difference": "+15.00",
  "discount_percentage": "+30.0%",
  
  "freshness_score": 0.92,
  "freshness_category": "Excellent",
  
  "current_demand_index": 8,
  
  "pricing_factors": {
    "freshness": {
      "score": 0.92,
      "category": "Excellent",
      "multiplier": 1.0,
      "impact": "Fresh: Excellent (0% discount)"
    },
    "demand": {
      "index": 8,
      "level": "High",
      "multiplier": 1.25,
      "impact": "High demand justifies premium"
    },
    "seasonal": {
      "season": "high",
      "multiplier": 1.2,
      "impact": "Peak season advantage"
    },
    "explanation": "Price increased by $15.00 (+30%)..."
  },
  
  "farmer": {
    "username": "local_farmer",
    "farm_name": "Green Valley Farms"
  }
}
"""


# ============================================================================
# EXAMPLE 7: Admin Dashboard Query
# ============================================================================

"""
File: backend/core/admin.py

Display pricing insights in Django admin:
"""

"""
from django.contrib import admin
from products.models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    
    list_display = [
        'name',
        'farmer',
        'base_price',
        'current_price',
        'freshness_category',
        'current_demand_index',
        'price_last_updated'
    ]
    
    list_filter = [
        'freshness_category',
        'current_demand_index',
        'category',
        'created_at'
    ]
    
    readonly_fields = [
        'current_price',
        'freshness_score',
        'freshness_category',
        'pricing_factors',
        'price_last_updated'
    ]
    
    fieldsets = (
        ('Product Info', {
            'fields': ('name', 'description', 'category', 'farmer', 'quantity')
        }),
        ('Pricing', {
            'fields': ('base_price', 'current_price', 'current_demand_index')
        }),
        ('Freshness & Analysis', {
            'fields': ('freshness_score', 'freshness_category', 'image')
        }),
        ('Pricing Details', {
            'fields': ('pricing_factors', 'price_last_updated'),
            'classes': ('collapse',)
        }),
    )
"""


# ============================================================================
# EXAMPLE 8: Command for Batch Operations
# ============================================================================

"""
File: backend/products/management/commands/update_prices.py

Django management command for manual price updates:
"""

"""
from django.core.management.base import BaseCommand
from products.models import Product
from pricing.pricing_service import DynamicPricingCalculator

class Command(BaseCommand):
    help = 'Update dynamic prices for all products'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--category',
            type=str,
            help='Update only specific category'
        )
        parser.add_argument(
            '--demand',
            type=int,
            default=5,
            help='Global demand index to use (default: 5)'
        )
    
    def handle(self, *args, **options):
        calculator = DynamicPricingCalculator()
        category = options.get('category')
        demand_index = options['demand']
        
        # Filter products
        products = Product.objects.filter(status='active')
        if category:
            products = products.filter(category=category)
        
        self.stdout.write(f"Updating {products.count()} products...")
        
        for product in products:
            try:
                pricing = calculator.calculate_dynamic_price(
                    base_price=float(product.base_price),
                    freshness_score=product.freshness_score or 0.8,
                    demand_index=demand_index
                )
                
                product.current_price = pricing['suggested_price']
                product.current_demand_index = demand_index
                product.save()
                
                self.stdout.write(
                    f"✓ {product.name}: ${product.base_price} → ${pricing['suggested_price']}"
                )
            
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ {product.name}: {str(e)}")
                )

# Usage:
# python manage.py update_prices
# python manage.py update_prices --category=vegetables
# python manage.py update_prices --demand=8
"""


# ============================================================================
# USAGE SUMMARY
# ============================================================================

"""
1. UPDATE PRODUCT WITH NEW PRICE:
   PATCH /api/products/1/update_dynamic_price/
   {
       "freshness_score": 0.85,
       "demand_index": 7,
       "season": "high"
   }

2. ANALYZE IMAGE AND UPDATE PRICE:
   POST /api/products/1/analyze_and_price/
   Content-Type: multipart/form-data
   image: <file>
   demand_index: 7
   season: high

3. VIEW PRODUCT WITH PRICING:
   GET /api/products/1/
   Response includes: current_price, freshness_category, pricing_factors

4. BATCH UPDATE ALL PRICES:
   python manage.py update_prices --demand=7

5. PERIODIC UPDATES (with Celery):
   celery beat will run update_all_product_prices every 2 hours
"""
