"""
End-to-End Workflow Example: From Product Image to Dynamic Pricing

This script demonstrates the complete workflow:
1. Register/Login (get JWT token)
2. Predict freshness from product image
3. Calculate dynamic price based on freshness + demand
4. Show pricing recommendations and breakdown

Usage:
    python workflow_example.py
"""

import requests
import json
from time import sleep


class FarmerWorkflow:
    """Complete workflow example for farmer pricing."""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.session = requests.Session()
    
    def register_user(self, username, email, password):
        """Register a new farmer account."""
        print("\n" + "="*70)
        print("STEP 1: Register Farmer Account")
        print("="*70)
        
        url = f"{self.base_url}/api/register/"
        payload = {
            "username": username,
            "email": email,
            "password": password,
            "password2": password,
            "role": "farmer"
        }
        
        print(f"\nRegistering user: {username}")
        response = self.session.post(url, json=payload)
        
        if response.status_code == 201:
            print("✅ Registration successful!")
            return True
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(response.json())
            return False
    
    def login_user(self, username, password):
        """Login and get JWT token."""
        print("\n" + "="*70)
        print("STEP 2: Login & Get JWT Token")
        print("="*70)
        
        url = f"{self.base_url}/api/token/"
        payload = {
            "username": username,
            "password": password
        }
        
        print(f"\nLogging in as: {username}")
        response = self.session.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access']
            self.user_id = data.get('user_id')
            
            # Set auth header
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
            
            print(f"✅ Login successful!")
            print(f"   Token: {self.token[:50]}...")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(response.json())
            return False
    
    def predict_freshness(self, image_path):
        """Upload product image and predict freshness."""
        print("\n" + "="*70)
        print("STEP 3: Analyze Product Image for Freshness")
        print("="*70)
        
        url = f"{self.base_url}/api/pricing/predict-freshness/"
        
        print(f"\nUploading image: {image_path}")
        
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = self.session.post(url, files=files)
        
        if response.status_code == 200:
            prediction = response.json()
            print(f"✅ Freshness analysis complete!")
            print(f"   Freshness Score: {prediction['freshness_score']} (0-1)")
            print(f"   Category: {prediction['freshness_category']}")
            print(f"   Shelf Life: {prediction['estimated_remaining_days']} days")
            return prediction
        else:
            print(f"❌ Analysis failed: {response.status_code}")
            print(response.json())
            return None
    
    def calculate_dynamic_price(self, base_price, freshness_score, demand_index, season=None):
        """Calculate dynamic price based on multiple factors."""
        print("\n" + "="*70)
        print("STEP 4: Calculate Dynamic Price")
        print("="*70)
        
        url = f"{self.base_url}/api/pricing/advanced-dynamic-price/"
        
        payload = {
            "base_price": base_price,
            "freshness_score": freshness_score,
            "demand_index": demand_index,
            "season": season,
            "include_range": True,
            "variance": 0.05
        }
        
        print(f"\nInputs:")
        print(f"  Base Price: ${base_price}")
        print(f"  Freshness Score: {freshness_score} ({self._get_freshness_category(freshness_score)})")
        print(f"  Demand Index: {demand_index}/10")
        if season:
            print(f"  Season: {season}")
        
        response = self.session.post(url, json=payload)
        
        if response.status_code == 200:
            pricing = response.json()
            return pricing
        else:
            print(f"❌ Pricing calculation failed: {response.status_code}")
            print(response.json())
            return None
    
    def show_pricing_summary(self, pricing_result):
        """Display pricing summary with recommendations."""
        print("\n✅ PRICING CALCULATION COMPLETE\n")
        
        base = pricing_result['base_price']
        suggested = pricing_result['suggested_price']
        diff = pricing_result['price_difference']
        pct = pricing_result['percentage_change']
        
        print("📊 PRICING BREAKDOWN")
        print("-" * 70)
        print(f"Base Price:           ${base:.2f}")
        print(f"Suggested Price:      ${suggested:.2f}")
        print(f"Price Difference:     ${diff:+.2f} ({pct:+.1f}%)")
        print()
        
        # Freshness breakdown
        fresh = pricing_result['freshness_factor']
        print(f"🍅 FRESHNESS FACTOR: {fresh['category']}")
        print(f"   Score: {fresh['score']} (Range: {fresh['score_range']})")
        print(f"   Multiplier: {fresh['multiplier']}x")
        print(f"   Discount: {fresh['discount']}%")
        print()
        
        # Demand breakdown
        demand = pricing_result['demand_factor']
        print(f"📈 DEMAND FACTOR: {demand['level']}")
        print(f"   Index: {demand['index']}/10")
        print(f"   Multiplier: {demand['multiplier']}x")
        print(f"   Change: {demand['percentage_change']:+.1f}%")
        print()
        
        # Seasonal breakdown
        seasonal = pricing_result['seasonal_factor']
        print(f"🌍 SEASONAL FACTOR: {seasonal['season'].upper()}")
        print(f"   {seasonal['description']}")
        print(f"   Multiplier: {seasonal['multiplier']}x")
        print(f"   Change: {seasonal['percentage_change']:+.1f}%")
        print()
        
        # Price range
        if 'price_range' in pricing_result:
            price_range = pricing_result['price_range']
            print("💰 RECOMMENDED PRICE RANGE")
            print("-" * 70)
            print(f"Competitive Price: ${price_range['minimum_price']:.2f}")
            print(f"Suggested Price:   ${price_range['suggested_price']:.2f} ⭐ RECOMMENDED")
            print(f"Premium Price:     ${price_range['maximum_price']:.2f}")
            print()
        
        # Explanation
        print("📝 EXPLANATION")
        print("-" * 70)
        print(pricing_result['explanation'])
        print()
        
        # Formula
        print("🧮 CALCULATION FORMULA")
        print("-" * 70)
        print(pricing_result['calculation_formula'])
        print()
    
    def run_complete_workflow(self, image_path, base_price, demand_index, season=None):
        """Run complete workflow."""
        print("\n" + "█"*70)
        print("█" + " "*68 + "█")
        print("█" + "  COMPLETE FARMER WORKFLOW: IMAGE → FRESHNESS → PRICE".center(68) + "█")
        print("█" + " "*68 + "█")
        print("█"*70)
        
        # Step 1: Get freshness
        freshness_result = self.predict_freshness(image_path)
        if not freshness_result:
            return
        
        freshness_score = freshness_result['freshness_score']
        
        # Step 2: Calculate dynamic price
        pricing_result = self.calculate_dynamic_price(
            base_price=base_price,
            freshness_score=freshness_score,
            demand_index=demand_index,
            season=season
        )
        
        if not pricing_result:
            return
        
        # Step 3: Display summary
        self.show_pricing_summary(pricing_result)
        
        # Recommendations
        self.show_recommendations(base_price, freshness_score, demand_index, pricing_result)
    
    def show_recommendations(self, base_price, freshness_score, demand_index, pricing):
        """Show business recommendations."""
        print("💡 BUSINESS RECOMMENDATIONS")
        print("-" * 70)
        
        suggested = pricing['suggested_price']
        min_price = pricing.get('price_range', {}).get('minimum_price', suggested * 0.95)
        max_price = pricing.get('price_range', {}).get('maximum_price', suggested * 1.05)
        
        # Recommendation 1: Pricing strategy
        diff_pct = ((suggested - base_price) / base_price) * 100
        
        if diff_pct > 30:
            print("🔥 HIGH DEMAND / FRESH PRODUCT")
            print(f"   Strategy: Premium Pricing")
            print(f"   → List at suggested price (${suggested:.2f})")
            print(f"   → Can go up to premium price (${max_price:.2f})")
            print(f"   → Expected high demand, list soon")
        
        elif diff_pct < -20:
            print("⚡ AGING INVENTORY / LOW DEMAND")
            print(f"   Strategy: Quick Clearance")
            print(f"   → List at competitive price (${min_price:.2f})")
            print(f"   → Must sell quickly to avoid spoilage")
            print(f"   → Suggested price: ${suggested:.2f}")
        
        else:
            print("✅ STANDARD PRICING")
            print(f"   Strategy: Market Rate")
            print(f"   → List at suggested price (${suggested:.2f})")
            print(f"   → Can adjust between ${min_price:.2f} - ${max_price:.2f}")
            print(f"   → Competitive positioning")
        
        print()
        
        # Recommendation 2: Inventory action
        days_remaining = int(freshness_score * 14)
        
        if days_remaining < 2:
            print("🚨 URGENT: Product expiring soon")
            print("   Action: Deep discount or removal")
        
        elif days_remaining < 5:
            print("⚠️ CAUTION: Limited shelf life")
            print("   Action: Consider promotional pricing")
        
        else:
            print("✅ GOOD: Adequate shelf life")
            print("   Action: Standard pricing appropriate")
        
        print()
        
        # Recommendation 3: Timing
        if demand_index >= 8:
            print("🎯 TIMING: List immediately")
            print("   High demand window - price premium justified")
        
        elif demand_index <= 3:
            print("⏰ TIMING: Consider waiting")
            print("   Low demand - may be better to wait for demand to increase")
        
        else:
            print("📅 TIMING: Good for listing")
            print("   Normal demand - standard pricing appropriate")
        
        print()
    
    @staticmethod
    def _get_freshness_category(score):
        """Get category name from score."""
        if score >= 0.8:
            return "Excellent"
        elif score >= 0.6:
            return "Good"
        elif score >= 0.4:
            return "Fair"
        elif score >= 0.2:
            return "Poor"
        else:
            return "Not Fresh"


# ============================================================================
# EXAMPLE SCENARIOS
# ============================================================================

def scenario_morning_tomatoes():
    """Scenario: Fresh tomatoes at morning peak."""
    print("\n" + "░"*70)
    print("░" + " "*68 + "░")
    print("░" + "  SCENARIO 1: Fresh Tomatoes - Morning Peak".center(68) + "░")
    print("░" + " "*68 + "░")
    print("░"*70)
    
    print("\nContext:")
    print("  • Just harvested this morning")
    print("  • Farmers market opening (high demand hours)")
    print("  • Summer season (peak supply)")
    print("  • Base cost: $50/kg")
    
    workflow = FarmerWorkflow()
    
    # Simulate the pricing calculation (without actual image/auth)
    print("\n→ Running pricing calculation...")
    
    result = {
        'base_price': 50.0,
        'suggested_price': 75.0,
        'price_difference': 25.0,
        'percentage_change': 50.0,
        'final_discount_percentage': 0.0,
        'freshness_factor': {
            'score': 0.95,
            'category': 'Excellent',
            'multiplier': 1.0,
            'discount': 0,
            'impact': 'Freshness: Excellent (0% discount)'
        },
        'demand_factor': {
            'index': 9,
            'level': 'Very High',
            'multiplier': 1.417,
            'percentage_change': 41.7,
            'impact': 'Very high demand justifies premium'
        },
        'seasonal_factor': {
            'season': 'high',
            'multiplier': 1.2,
            'percentage_change': 20.0,
            'description': 'Peak season with higher demand',
            'impact': 'Season: High'
        },
        'explanation': 'Price increased by $25.00 (+50%)\nFreshness: Excellent - 0% off base\nVery high demand (Very High) justifies premium\nPeak season (high) enables 20% markup\nRecommended selling price: $75.00',
        'calculation_formula': 'Suggested Price = 50.0 × 1.0 (freshness) × 1.417 (demand) × 1.2 (seasonal) = 85.02',
        'price_range': {
            'minimum_price': 71.25,
            'suggested_price': 75.0,
            'maximum_price': 78.75,
            'variance_percentage': 5.0,
            'insights': ['Competitive price: $71.25', 'Suggested price: $75.00', 'Premium price: $78.75']
        }
    }
    
    workflow.show_pricing_summary(result)
    workflow.show_recommendations(50.0, 0.95, 9, result)


def scenario_evening_lettuce():
    """Scenario: Aging lettuce at end of day."""
    print("\n" + "░"*70)
    print("░" + " "*68 + "░")
    print("░" + "  SCENARIO 2: Aging Lettuce - End of Day".center(68) + "░")
    print("░" + " "*68 + "░")
    print("░"*70)
    
    print("\nContext:")
    print("  • Picked 2 days ago, visible aging")
    print("  • End of market day (low demand)")
    print("  • Must clear before closing")
    print("  • Base cost: $30/kg")
    
    workflow = FarmerWorkflow()
    
    print("\n→ Running pricing calculation...")
    
    result = {
        'base_price': 30.0,
        'suggested_price': 12.9,
        'price_difference': -17.1,
        'percentage_change': -57.0,
        'final_discount_percentage': 57.0,
        'freshness_factor': {
            'score': 0.45,
            'category': 'Fair',
            'multiplier': 0.65,
            'discount': 35,
            'impact': 'Freshness: Fair (35% discount)'
        },
        'demand_factor': {
            'index': 2,
            'level': 'Very Low',
            'multiplier': 0.583,
            'percentage_change': -41.7,
            'impact': 'Price reduction due to low demand'
        },
        'seasonal_factor': {
            'season': 'normal',
            'multiplier': 1.0,
            'percentage_change': 0.0,
            'description': 'Normal supply and demand',
            'impact': 'Season: Normal'
        },
        'explanation': 'Price reduced by $17.10 (-57%)\nFreshness: Fair - 35% off base\nVery low demand (Very Low) requires competitive pricing\nNo seasonal adjustment\nRecommended selling price: $12.90',
        'calculation_formula': 'Suggested Price = 30.0 × 0.65 (freshness) × 0.583 (demand) × 1.0 (seasonal) = 11.39',
        'price_range': {
            'minimum_price': 12.26,
            'suggested_price': 12.9,
            'maximum_price': 13.55,
            'variance_percentage': 5.0,
            'insights': ['Competitive price: $12.26', 'Suggested price: $12.90', 'Premium price: $13.55']
        }
    }
    
    workflow.show_pricing_summary(result)
    workflow.show_recommendations(30.0, 0.45, 2, result)


def scenario_winter_import():
    """Scenario: Off-season imported produce."""
    print("\n" + "░"*70)
    print("░" + " "*68 + "░")
    print("░" + "  SCENARIO 3: Winter Imported Produce".center(68) + "░")
    print("░" + " "*68 + "░")
    print("░"*70)
    
    print("\nContext:")
    print("  • Imported from warm region")
    print("  • Winter supply (low local demand)")
    print("  • Cold storage (aged 3 days)")
    print("  • Base cost: $100/kg (imported+storage)")
    
    workflow = FarmerWorkflow()
    
    print("\n→ Running pricing calculation...")
    
    result = {
        'base_price': 100.0,
        'suggested_price': 54.6,
        'price_difference': -45.4,
        'percentage_change': -45.4,
        'final_discount_percentage': 45.4,
        'freshness_factor': {
            'score': 0.72,
            'category': 'Good',
            'multiplier': 0.85,
            'discount': 15,
            'impact': 'Freshness: Good (15% discount)'
        },
        'demand_factor': {
            'index': 3,
            'level': 'Low',
            'multiplier': 0.667,
            'percentage_change': -33.3,
            'impact': 'Slight price reduction'
        },
        'seasonal_factor': {
            'season': 'low',
            'multiplier': 0.7,
            'percentage_change': -30.0,
            'description': 'Off-season supply abundant',
            'impact': 'Season: Low'
        },
        'explanation': 'Price reduced by $45.40 (-45.4%)\nFreshness: Good - 15% off base\nLow demand (Low) requires competitive pricing\nOff-season (low) requires 30% reduction\nRecommended selling price: $54.60',
        'calculation_formula': 'Suggested Price = 100.0 × 0.85 (freshness) × 0.667 (demand) × 0.7 (seasonal) = 39.77',
        'price_range': {
            'minimum_price': 51.87,
            'suggested_price': 54.6,
            'maximum_price': 57.33,
            'variance_percentage': 5.0,
            'insights': ['Competitive price: $51.87', 'Suggested price: $54.60', 'Premium price: $57.33']
        }
    }
    
    workflow.show_pricing_summary(result)
    workflow.show_recommendations(100.0, 0.72, 3, result)


if __name__ == "__main__":
    import sys
    
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + "  END-TO-END WORKFLOW DEMONSTRATIONS".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70)
    
    print("\nShowing 3 real-world scenarios...")
    print("(Uses simulated data - no server required)")
    
    try:
        scenario_morning_tomatoes()
        sleep(1)
        scenario_evening_lettuce()
        sleep(1)
        scenario_winter_import()
        
        print("\n" + "█"*70)
        print("█" + " "*68 + "█")
        print("█" + "  SCENARIOS COMPLETE".center(68) + "█")
        print("█" + " "*68 + "█")
        print("█"*70)
        
        print("\n✅ All scenarios demonstrated successfully!")
        print("\nTo test with actual API:")
        print("1. Set up image path: /path/to/product/image.jpg")
        print("2. Have backend running: python manage.py runserver")
        print("3. Get JWT token from login endpoint")
        print("4. Update script with token and run!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)
