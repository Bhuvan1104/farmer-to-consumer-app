# 🎯 Dynamic Pricing System - Complete Guide

## Overview

The Dynamic Pricing System automatically calculates optimal product prices based on multiple real-world factors:

1. **Freshness Score** (0-1) - Product quality degradation
2. **Demand Index** (1-10) - Current market demand
3. **Seasonal Multiplier** - Time-of-year adjustments
4. **Base Price** - Original cost

## 📊 Pricing Formula

```
Suggested Price = Base Price × Freshness Multiplier × Demand Multiplier × Seasonal Multiplier
```

### Example Calculation
```
Base Price: $100
Freshness Multiplier: 0.85 (Good condition)
Demand Multiplier: 1.333 (High demand)
Seasonal Multiplier: 1.2 (Peak season)

Suggested Price = $100 × 0.85 × 1.333 × 1.2 = $136.36
```

---

## 🔧 API Endpoint

### Endpoint
```
POST /api/pricing/advanced-dynamic-price/
```

### Authentication
```
Header: Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 📨 Request Parameters

### Required Parameters

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `base_price` | float | > 0 | Original product price |
| `freshness_score` | float | 0.0-1.0 | Freshness (0=expired, 1=perfect) |
| `demand_index` | int | 1-10 | Market demand level |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `season` | string | auto-detect | Season: `low`, `moderate`, `normal`, `high`, `very_high` |
| `include_range` | boolean | false | Include min/max price range |
| `variance` | float | 0.05 (5%) | Price range variance |

---

## 📝 Request Examples

### Basic Request (Auto-detect Season)
```bash
curl -X POST http://localhost:8000/api/pricing/advanced-dynamic-price/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "base_price": 100.0,
    "freshness_score": 0.85,
    "demand_index": 7
  }'
```

### Full Request (With All Parameters)
```bash
curl -X POST http://localhost:8000/api/pricing/advanced-dynamic-price/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "base_price": 50.0,
    "freshness_score": 0.92,
    "demand_index": 8,
    "season": "high",
    "include_range": true,
    "variance": 0.05
  }'
```

### Request with Price Range
```bash
curl -X POST http://localhost:8000/api/pricing/advanced-dynamic-price/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "base_price": 75.0,
    "freshness_score": 0.65,
    "demand_index": 5,
    "season": "moderate",
    "include_range": true,
    "variance": 0.1
  }'
```

---

## 📤 Response Format

### Successful Response (200 OK)
```json
{
  "base_price": 100.0,
  "suggested_price": 136.36,
  "price_difference": 36.36,
  "percentage_change": 36.36,
  "final_discount_percentage": 0.0,
  
  "freshness_factor": {
    "score": 0.85,
    "category": "Good",
    "multiplier": 0.85,
    "discount": 15,
    "impact": "Freshness: Good (15% discount)"
  },
  
  "demand_factor": {
    "index": 7,
    "level": "High",
    "multiplier": 1.333,
    "percentage_change": 33.3,
    "impact": "Moderate price increase"
  },
  
  "seasonal_factor": {
    "season": "high",
    "multiplier": 1.2,
    "percentage_change": 20.0,
    "description": "Peak season with higher demand",
    "impact": "Season: High"
  },
  
  "explanation": "Price increased by $36.36 (+36.36%)\nFreshness: Good - 15% off base price\nHigh demand (High) justifies price premium\nPeak season (high) enables 20.0% markup\nRecommended selling price: $136.36",
  
  "calculation_formula": "Suggested Price = 100.0 × 0.85 (freshness) × 1.333 (demand) × 1.2 (seasonal) = 136.36"
}
```

### Response with Price Range
```json
{
  "base_price": 75.0,
  "suggested_price": 42.9,
  "price_difference": -32.1,
  "percentage_change": -42.8,
  "final_discount_percentage": 42.8,
  
  "freshness_factor": { ... },
  "demand_factor": { ... },
  "seasonal_factor": { ... },
  
  "explanation": "...",
  "calculation_formula": "...",
  
  "price_range": {
    "minimum_price": 40.76,
    "suggested_price": 42.9,
    "maximum_price": 45.05,
    "variance_percentage": 10.0,
    "insights": [
      "Competitive price: $40.76",
      "Suggested price: $42.9",
      "Premium price: $45.05"
    ]
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "error": "Invalid request",
  "details": {
    "demand_index": ["Ensure this value is less than or equal to 10."]
  }
}
```

---

## 🎯 Factor Details

### 1. Freshness Multiplier

| Score Range | Category | Multiplier | Discount | Use Case |
|-------------|----------|-----------|----------|----------|
| 0.8 - 1.0 | Excellent | 1.0 | 0% | Just harvested, perfect condition |
| 0.6 - 0.8 | Good | 0.85 | 15% | 2-3 days old, still fresh |
| 0.4 - 0.6 | Fair | 0.65 | 35% | 5-7 days old, visible aging |
| 0.2 - 0.4 | Poor | 0.40 | 60% | Near expiry, immediate sale needed |
| 0.0 - 0.2 | Not Fresh | 0.20 | 80% | Expiring/expired, deep discount |

#### How to Get Freshness Score
```bash
# 1. Upload product image to freshness prediction
POST /api/pricing/predict-freshness/
Content-Type: multipart/form-data
image: <product_image>

# Return includes freshness_score (0-1)
```

### 2. Demand Index (1-10 Scale)

| Index | Level | Description | Price Multiplier |
|-------|-------|-------------|-----------------|
| 1 | Very Low | Almost no demand | 0.5 (50% off) |
| 2-3 | Low | Below normal demand | 0.667-0.833 |
| 4-5 | Moderate | Normal market conditions | 0.917-1.0 |
| 6-7 | High | Above normal demand | 1.083-1.167 |
| 8-10 | Very High | Peak demand period | 1.25-1.5 (50% markup) |

#### How to Determine Demand Index

**Manual Analysis:**
- Monitor order volume hourly
- Compare to historical average
- Adjust 1-10 based on velocity

**Data Sources:**
- Recent order count
- Queue length
- Search frequency
- Competitor stock levels

**Example Scenarios:**
```python
# Tomatoes in summer
demand_index = 9  # Very high (peak season, high sales velocity)

# Tomatoes in winter
demand_index = 2  # Low (imported, high storage cost, slow sales)

# Cucumbers after rain (spoils quickly)
demand_index = 7  # High (urgency to sell before spoilage)

# Lettuce on Tuesday (middle of week)
demand_index = 5  # Normal (steady demand)
```

### 3. Seasonal Multiplier

| Season | Multiplier | When | Rationale |
|--------|-----------|------|-----------|
| Low (0.7) | Winter | Off-season | Abundant storage produce, low demand |
| Moderate (0.95) | Spring/Fall | Shoulder | Transition period, mixed demand |
| Normal (1.0) | Regular | Standard conditions | No seasonal adjustment |
| High (1.2) | Summer | Peak season | Fresh local produce in season | 
| Very High (1.3) | Peak | Holiday/event | Maximum demand spikes |

#### Auto-Detection by Month
```
Jan-Feb (Winter) → "low" (0.7x)
Mar-May (Spring) → "moderate" (0.95x)
Jun-Aug (Summer) → "high" (1.2x)
Sep-Nov (Fall) → "normal" (1.0x)
```

#### Manual Override
```json
{
  "base_price": 100,
  "freshness_score": 0.8,
  "demand_index": 6,
  "season": "very_high"
}
```

---

## 💡 Use Cases & Examples

### Use Case 1: Fresh Morning Harvest
```python
# Tomatoes just picked, high demand (breakfast rush)
base_price = 50.0
freshness_score = 0.95  # Perfect condition
demand_index = 8        # High morning demand
season = "high"         # Summer peak

# Calculation
# 50 × 1.0 (excellent) × 1.25 (high demand) × 1.2 (summer) = $75
# Result: 50% markup - charge premium for fresh produce at peak demand
```

### Use Case 2: Aging Produce (End of Day)
```python
# Same tomatoes at end of day, lower demand
base_price = 50.0
freshness_score = 0.55  # Fair (aged throughout day)
demand_index = 3        # Low evening demand
season = "high"         # Still summer

# Calculation
# 50 × 0.65 (fair) × 0.833 (low demand) × 1.2 (summer) = $32.49
# Result: 35% discount - reduce price to clear inventory
```

### Use Case 3: Off-Season Produce
```python
# Imported tomatoes in winter
base_price = 100.0      # Higher cost (imported)
freshness_score = 0.72  # Good (cold storage)
demand_index = 4        # Normal demand
season = "low"          # Winter

# Calculation
# 100 × 0.85 (good) × 0.917 (normal) × 0.7 (winter) = $54.57
# Result: 45% discount - competitive pricing for import
```

### Use Case 4: Holiday Peak Demand
```python
# Any fresh local produce during holiday
base_price = 75.0
freshness_score = 0.88  # Excellent
demand_index = 9        # Very high demand
season = "very_high"    # Holiday peak

# Calculation
# 75 × 1.0 (excellent) × 1.417 (very high) × 1.3 (peak) = $137.81
# Result: 84% markup - maximize revenue during high-demand period
```

### Use Case 5: Organic Premium + High Freshness
```python
# Premium organic produce (already high base price)
base_price = 200.0      # Premium product
freshness_score = 0.96  # Nearly perfect
demand_index = 8        # High demand
season = "high"         # In-season

# Calculation
# 200 × 1.0 (excellent) × 1.25 (high demand) × 1.2 (high season) = $300
# Result: 50% markup - maintain premium positioning and capture demand
```

---

## 🐍 Python Integration Examples

### Example 1: Basic Calculation
```python
from pricing.pricing_service import DynamicPricingCalculator

calculator = DynamicPricingCalculator()

result = calculator.calculate_dynamic_price(
    base_price=100.0,
    freshness_score=0.85,
    demand_index=7,
    season="high"
)

print(f"Suggested Price: ${result['suggested_price']}")
print(f"Freshness Category: {result['freshness_factor']['category']}")
print(f"Explanation:\n{result['explanation']}")
```

### Example 2: Price Range Calculation
```python
from pricing.pricing_service import DynamicPricingCalculator

calculator = DynamicPricingCalculator()

result = calculator.calculate_price_range(
    base_price=75.0,
    freshness_score=0.65,
    demand_index=5,
    season="moderate",
    variance=0.1  # ±10% range
)

print(f"Min Price: ${result['minimum_price']}")
print(f"Suggested: ${result['suggested_price']}")
print(f"Max Price: ${result['maximum_price']}")
```

### Example 3: Quick Convenience Function
```python
from pricing.pricing_service import calculate_price

result = calculate_price(
    base_price=50.0,
    freshness_score=0.9,
    demand_index=8,
    season="high"
)

suggested_price = result['suggested_price']
print(f"List at: ${suggested_price}")
```

### Example 4: Product Update (Django Model)
```python
from products.models import Product
from pricing.pricing_service import DynamicPricingCalculator

# Get product and freshness prediction
product = Product.objects.get(id=1)
freshness_score = get_freshness_from_image(product.image)  # From ML API
demand_index = calculate_current_demand()  # From analytics

# Calculate dynamic price
calculator = DynamicPricingCalculator()
pricing = calculator.calculate_dynamic_price(
    base_price=product.base_price,
    freshness_score=freshness_score,
    demand_index=demand_index
)

# Update product
product.price = pricing['suggested_price']
product.freshness_score = freshness_score
product.save()
```

### Example 5: Batch Processing
```python
from products.models import Product
from pricing.pricing_service import DynamicPricingCalculator

calculator = DynamicPricingCalculator()
demand_index = calculate_current_demand()

for product in Product.objects.filter(status='active'):
    # Get freshness from image
    freshness = get_freshness_score(product.image)
    
    # Calculate price
    pricing = calculator.calculate_dynamic_price(
        base_price=product.base_price,
        freshness_score=freshness,
        demand_index=demand_index
    )
    
    # Update
    product.current_price = pricing['suggested_price']
    product.freshness_category = pricing['freshness_factor']['category']
    product.save()
```

---

## 📊 Factor Impact Analysis

### Sensitivity Analysis

**Base Price: $100**

| Freshness | Demand | Season | Result | Change |
|-----------|--------|--------|--------|--------|
| 0.9 | 5 | normal | $100 | 0% |
| 0.9 | 5 | high | $120 | +20% |
| 0.9 | 8 | high | $150 | +50% |
| 0.5 | 5 | high | $65 | -35% |
| 0.3 | 2 | high | $19.20 | -81% |

### Factor Contribution (at $100 base)

**Best Case Scenario** (Excellent+High Demand+Peak Season)
```
Freshness: 1.0 (100%)
Demand: 1.5 (150%)
Seasonal: 1.3 (130%)
Total: $195 (+95%)
```

**Worst Case Scenario** (Not Fresh+Very Low Demand+Off-Season)
```
Freshness: 0.2 (20%)
Demand: 0.5 (50%)
Seasonal: 0.7 (70%)
Total: $7 (-93%)
```

---

## ⚠️ Error Handling

### Invalid Freshness Score
```json
{
  "error": "Invalid parameters",
  "detail": "Freshness score must be between 0 and 1"
}
```

### Invalid Demand Index
```json
{
  "error": "Invalid parameters",
  "detail": "Demand index must be between 1 and 10"
}
```

### Invalid Base Price
```json
{
  "error": "Invalid parameters",
  "detail": "Base price must be greater than 0"
}
```

### Authentication Missing
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 🚀 Best Practices

### 1. Accurate Freshness Scoring
- Use ML image analysis for consistency
- Update every 4-6 hours
- Factor in storage temperature

### 2. Realistic Demand Index
- Track order velocity patterns
- Compare to 7-day average
- Account for time of day
- Monitor competitor activity

### 3. Seasonal Adjustments
- Override auto-detection for special events
- Consider local holidays
- Monitor weather impacts

### 4. Price Updates
- Update every 2-4 hours
- Avoid frequent drastic changes
- Show price history to customers
- Communicate discounts clearly

### 5. Monitoring & Analytics
- Track suggested vs. actual sales
- Monitor inventory turnover
- Measure profit impact
- A/B test price differences

---

## 📈 Performance Considerations

- **Response Time**: < 50ms
- **No Database Queries**: Service calculates in memory
- **Stateless**: Can be scaled horizontally
- **No External Dependencies**: Python/NumPy only

---

## 🔐 Security & Validation

✅ **Input Validation**
- Range checks on all parameters
- Type validation
- Explicit error messages

✅ **Authentication**
- JWT token required
- User identification in logs
- All operations tracked

✅ **Business Logic**
- Prevents extremes (0% to 100%+ pricing)
- Realistic multiplier ranges
- Sensible defaults

---

## 📞 Support & Troubleshooting

### Issue: Prices too high
- Check demand_index (should be 1-7 for most times)
- Verify freshness_score (should be updated regularly)
- Review seasonal setting

### Issue: Prices too low
- Ensure freshness_score not below 0.5
- Check if demand_index matches reality
- Verify base_price is reasonable

### Issue: Inconsistent results
- Use consistent demand methodology
- Verify freshness from ML API (not manual)
- Check dates for season auto-detection

---

**Last Updated**: February 23, 2026  
**Version**: 1.0  
**Status**: Production Ready
