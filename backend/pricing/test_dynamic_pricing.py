"""
Testing and Example Script for Dynamic Pricing API

This script demonstrates how to use the advanced dynamic pricing endpoint
with various real-world scenarios.

Run this after starting the backend server:
    python manage.py runserver

Make sure you have an authentication token first.
"""

import requests
import json
from pricing_service import DynamicPricingCalculator


# Configuration
BASE_URL = "http://localhost:8000/api/pricing"
DEMO_TOKEN = "YOUR_JWT_TOKEN"  # Replace with actual token


class DynamicPricingTester:
    """Test suite for dynamic pricing API."""
    
    def __init__(self, base_url=BASE_URL, token=None):
        self.base_url = base_url
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}" if token else "",
            "Content-Type": "application/json"
        }
    
    def test_basic_pricing(self):
        """Test basic dynamic pricing calculation."""
        print("\n" + "="*70)
        print("TEST 1: Basic Dynamic Pricing")
        print("="*70)
        
        payload = {
            "base_price": 100.0,
            "freshness_score": 0.85,
            "demand_index": 7
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        self._print_response(response)
        return response.json() if response.status_code == 200 else None
    
    def test_with_season(self):
        """Test pricing with explicit season specification."""
        print("\n" + "="*70)
        print("TEST 2: Pricing with Explicit Season (Peak Season)")
        print("="*70)
        
        payload = {
            "base_price": 50.0,
            "freshness_score": 0.92,
            "demand_index": 8,
            "season": "high"
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        self._print_response(response)
        return response.json() if response.status_code == 200 else None
    
    def test_with_price_range(self):
        """Test pricing with price range calculation."""
        print("\n" + "="*70)
        print("TEST 3: Pricing with Price Range (±5%)")
        print("="*70)
        
        payload = {
            "base_price": 75.0,
            "freshness_score": 0.65,
            "demand_index": 5,
            "season": "moderate",
            "include_range": True,
            "variance": 0.05
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        self._print_response(response)
        return response.json() if response.status_code == 200 else None
    
    def test_fresh_high_demand(self):
        """Test scenario: Fresh produce with high demand (premium pricing)."""
        print("\n" + "="*70)
        print("TEST 4: Scenario - Fresh Produce + High Demand (Premium)")
        print("="*70)
        
        scenario = {
            "description": "Locally grown tomatoes on summer morning (high demand)",
            "base_price": 50.0,
            "freshness_score": 0.95,
            "demand_index": 9,
            "season": "high",
            "include_range": True
        }
        
        print(f"\nScenario: {scenario['description']}")
        
        payload = {
            "base_price": scenario["base_price"],
            "freshness_score": scenario["freshness_score"],
            "demand_index": scenario["demand_index"],
            "season": scenario["season"],
            "include_range": scenario["include_range"]
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        result = self._print_response(response)
        
        if result:
            print(f"\n💡 Premium Pricing Strategy:")
            print(f"   Base:      ${result['base_price']}")
            print(f"   Suggested: ${result['suggested_price']}")
            print(f"   Markup:    {result['percentage_change']:.1f}%")
        
        return result
    
    def test_aging_low_demand(self):
        """Test scenario: Aging produce with low demand (discount pricing)."""
        print("\n" + "="*70)
        print("TEST 5: Scenario - Aging Produce + Low Demand (Discount)")
        print("="*70)
        
        scenario = {
            "description": "Day-old lettuce at end of day (low demand)",
            "base_price": 30.0,
            "freshness_score": 0.45,
            "demand_index": 2,
            "season": "normal",
            "include_range": True
        }
        
        print(f"\nScenario: {scenario['description']}")
        
        payload = {
            "base_price": scenario["base_price"],
            "freshness_score": scenario["freshness_score"],
            "demand_index": scenario["demand_index"],
            "season": scenario["season"],
            "include_range": scenario["include_range"]
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        result = self._print_response(response)
        
        if result:
            print(f"\n💡 Clearance Strategy:")
            print(f"   Base:      ${result['base_price']}")
            print(f"   Suggested: ${result['suggested_price']}")
            print(f"   Discount:  {abs(result['percentage_change']):.1f}%")
        
        return result
    
    def test_off_season_import(self):
        """Test scenario: Off-season imported produce."""
        print("\n" + "="*70)
        print("TEST 6: Scenario - Off-Season Imported Produce")
        print("="*70)
        
        scenario = {
            "description": "Winter imported tomatoes (high cost, low demand)",
            "base_price": 100.0,
            "freshness_score": 0.72,
            "demand_index": 3,
            "season": "low",
            "include_range": True
        }
        
        print(f"\nScenario: {scenario['description']}")
        
        payload = {
            "base_price": scenario["base_price"],
            "freshness_score": scenario["freshness_score"],
            "demand_index": scenario["demand_index"],
            "season": scenario["season"],
            "include_range": scenario["include_range"]
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        result = self._print_response(response)
        
        if result:
            print(f"\n💡 Off-Season Strategy:")
            print(f"   Base:      ${result['base_price']}")
            print(f"   Suggested: ${result['suggested_price']}")
            print(f"   Discount:  {abs(result['percentage_change']):.1f}%")
        
        return result
    
    def test_holiday_peak(self):
        """Test scenario: Holiday peak demand."""
        print("\n" + "="*70)
        print("TEST 7: Scenario - Holiday Peak Demand")
        print("="*70)
        
        scenario = {
            "description": "Fresh local produce during holiday rush",
            "base_price": 40.0,
            "freshness_score": 0.98,
            "demand_index": 10,
            "season": "very_high",
            "include_range": True
        }
        
        print(f"\nScenario: {scenario['description']}")
        
        payload = {
            "base_price": scenario["base_price"],
            "freshness_score": scenario["freshness_score"],
            "demand_index": scenario["demand_index"],
            "season": scenario["season"],
            "include_range": scenario["include_range"]
        }
        
        print(f"\nRequest Payload:")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        result = self._print_response(response)
        
        if result:
            print(f"\n💡 Peak Demand Strategy:")
            print(f"   Base:      ${result['base_price']}")
            print(f"   Suggested: ${result['suggested_price']}")
            print(f"   Markup:    {result['percentage_change']:.1f}%")
        
        return result
    
    def test_error_invalid_score(self):
        """Test error handling: invalid freshness score."""
        print("\n" + "="*70)
        print("TEST 8: Error Handling - Invalid Freshness Score")
        print("="*70)
        
        payload = {
            "base_price": 100.0,
            "freshness_score": 1.5,  # Invalid: > 1.0
            "demand_index": 5
        }
        
        print(f"\nRequest Payload (Invalid - score > 1.0):")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        self._print_response(response)
    
    def test_error_invalid_demand(self):
        """Test error handling: invalid demand index."""
        print("\n" + "="*70)
        print("TEST 9: Error Handling - Invalid Demand Index")
        print("="*70)
        
        payload = {
            "base_price": 100.0,
            "freshness_score": 0.8,
            "demand_index": 15  # Invalid: > 10
        }
        
        print(f"\nRequest Payload (Invalid - index > 10):")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        self._print_response(response)
    
    def test_error_invalid_price(self):
        """Test error handling: invalid base price."""
        print("\n" + "="*70)
        print("TEST 10: Error Handling - Invalid Base Price")
        print("="*70)
        
        payload = {
            "base_price": -50.0,  # Invalid: negative
            "freshness_score": 0.8,
            "demand_index": 5
        }
        
        print(f"\nRequest Payload (Invalid - negative price):")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(
            f"{self.base_url}/advanced-dynamic-price/",
            json=payload,
            headers=self.headers
        )
        
        self._print_response(response)
    
    @staticmethod
    def _print_response(response):
        """Pretty print API response."""
        print(f"\nStatus Code: {response.status_code}")
        print("-" * 70)
        
        try:
            data = response.json()
            print(json.dumps(data, indent=2))
            return data
        except:
            print(response.text)
            return None
    
    def run_all_tests(self):
        """Run all test cases."""
        print("\n" + "█"*70)
        print("█" + " "*68 + "█")
        print("█" + "  DYNAMIC PRICING API - COMPREHENSIVE TEST SUITE".center(68) + "█")
        print("█" + " "*68 + "█")
        print("█"*70)
        
        results = []
        
        try:
            results.append(("Basic Pricing", self.test_basic_pricing()))
            results.append(("With Season", self.test_with_season()))
            results.append(("With Price Range", self.test_with_price_range()))
            results.append(("Fresh High Demand", self.test_fresh_high_demand()))
            results.append(("Aging Low Demand", self.test_aging_low_demand()))
            results.append(("Off-Season Import", self.test_off_season_import()))
            results.append(("Holiday Peak", self.test_holiday_peak()))
            results.append(("Error: Invalid Score", self.test_error_invalid_score()))
            results.append(("Error: Invalid Demand", self.test_error_invalid_demand()))
            results.append(("Error: Invalid Price", self.test_error_invalid_price()))
        
        except requests.exceptions.ConnectionError:
            print("\n❌ ERROR: Could not connect to backend server")
            print("   Make sure the server is running: python manage.py runserver")
            return
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            return
        
        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {len(results)}")
        print("\nNote: Check individual test outputs for detailed results")
        print("="*70)


# Local testing functions (no API required)
def test_pricing_service_locally():
    """Test pricing service calculations without API."""
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + "  LOCAL PRICING SERVICE TEST (No API Required)".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70)
    
    calculator = DynamicPricingCalculator()
    
    # Test 1: Basic calculation
    print("\n" + "="*70)
    print("LOCAL TEST 1: Basic Calculation")
    print("="*70)
    
    result = calculator.calculate_dynamic_price(
        base_price=100.0,
        freshness_score=0.85,
        demand_index=7,
        season="high"
    )
    
    print(f"\nBase Price: $100.0")
    print(f"Freshness: {result['freshness_factor']['category']} ({result['freshness_score']})")
    print(f"Demand: {result['demand_factor']['level']} ({result['demand_factor']['index']})")
    print(f"Season: {result['seasonal_factor']['season']}")
    print(f"\n→ Suggested Price: ${result['suggested_price']}")
    print(f"\nExplanation:")
    print(result['explanation'])
    
    # Test 2: Price range
    print("\n" + "="*70)
    print("LOCAL TEST 2: Price Range Calculation")
    print("="*70)
    
    range_result = calculator.calculate_price_range(
        base_price=75.0,
        freshness_score=0.65,
        demand_index=5,
        variance=0.1
    )
    
    print(f"\nPrice Range (±10%):")
    print(f"  Minimum:  ${range_result['minimum_price']}")
    print(f"  Suggested: ${range_result['suggested_price']}")
    print(f"  Maximum:  ${range_result['maximum_price']}")
    
    for insight in range_result['price_range_insights']:
        print(f"  • {insight}")
    
    # Test 3: Edge cases
    print("\n" + "="*70)
    print("LOCAL TEST 3: Edge Cases")
    print("="*70)
    
    edge_cases = [
        ("Best Case (Fresh+High Demand+Peak)", 50, 1.0, 10, "very_high"),
        ("Worst Case (Not Fresh+Low Demand+Off)", 50, 0.1, 1, "low"),
        ("Moderate Case", 50, 0.5, 5, "normal"),
    ]
    
    for label, base, freshness, demand, season in edge_cases:
        result = calculator.calculate_dynamic_price(base, freshness, demand, season)
        print(f"\n{label}:")
        print(f"  Input: ${base} base, {freshness} fresh, {demand} demand, {season} season")
        print(f"  Result: ${result['suggested_price']}")
        print(f"  Change: {result['percentage_change']:+.1f}%")


if __name__ == "__main__":
    import sys
    
    # Test locally first (no API required)
    print("\nStarting local service tests...")
    test_pricing_service_locally()
    
    # Test API (requires running server)
    print("\n\nNow testing API endpoints...")
    print("Note: Make sure your JWT token is set in DEMO_TOKEN")
    
    # Get token from user if not set
    if DEMO_TOKEN == "YOUR_JWT_TOKEN":
        print("\n⚠️  WARNING: JWT token not configured!")
        print("To test API endpoints:")
        print("1. Login to get a token:")
        print("   curl -X POST http://localhost:8000/api/token/")
        print("2. Set DEMO_TOKEN variable in this script")
        print("\nSkipping API tests for now...")
    else:
        tester = DynamicPricingTester(token=DEMO_TOKEN)
        tester.run_all_tests()
