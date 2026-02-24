"""
Example: Integrating Freshness Prediction with Product Management

This script demonstrates how to:
1. Upload an image
2. Get freshness prediction
3. Calculate dynamic price
4. Update product with freshness score
"""

import requests
import json
from datetime import datetime


class FarmerAPI:
    """Client for interacting with the Farmer-to-Consumer API"""
    
    def __init__(self, base_url='http://localhost:8000', username='bhuvan', password='password'):
        self.base_url = base_url
        self.api_url = f'{base_url}/api'
        self.token = None
        self.authenticate(username, password)
    
    def authenticate(self, username, password):
        """Get authentication token"""
        response = requests.post(
            f'{self.api_url}/token/',
            json={'username': username, 'password': password}
        )
        
        if response.status_code == 200:
            self.token = response.json()['access']
            print(f"✅ Authenticated as {username}")
        else:
            print(f"❌ Authentication failed: {response.json()}")
            raise Exception("Authentication failed")
    
    def _headers(self):
        """Get authorization headers"""
        return {'Authorization': f'Bearer {self.token}'}
    
    def predict_freshness(self, image_path):
        """
        Predict freshness from an image
        
        Args:
            image_path: Path to product image
            
        Returns:
            Freshness prediction data
        """
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(
                f'{self.api_url}/pricing/predict-freshness/',
                files=files,
                headers=self._headers()
            )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Freshness prediction failed: {response.json()}")
    
    def calculate_dynamic_price(self, base_price, freshness_score):
        """
        Calculate dynamic price based on freshness
        
        Args:
            base_price: Original product price
            freshness_score: Freshness score (0-1)
            
        Returns:
            Price calculation data
        """
        response = requests.post(
            f'{self.api_url}/pricing/dynamic-price/',
            json={
                'base_price': base_price,
                'freshness_score': freshness_score
            },
            headers=self._headers()
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Price calculation failed: {response.json()}")
    
    def create_product(self, name, category, price, quantity, freshness_score=None):
        """
        Create a new product
        
        Args:
            name: Product name
            category: Product category
            price: Base price
            quantity: Available quantity
            freshness_score: Optional freshness score
            
        Returns:
            Created product data
        """
        data = {
            'name': name,
            'category': category,
            'price': price,
            'quantity': quantity,
        }
        
        if freshness_score is not None:
            data['freshness_score'] = freshness_score
        
        response = requests.post(
            f'{self.api_url}/products/',
            json=data,
            headers=self._headers()
        )
        
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Product creation failed: {response.json()}")
    
    def update_product(self, product_id, **kwargs):
        """
        Update a product
        
        Args:
            product_id: Product ID
            **kwargs: Fields to update (name, category, price, quantity, freshness_score)
            
        Returns:
            Updated product data
        """
        response = requests.patch(
            f'{self.api_url}/products/{product_id}/',
            json=kwargs,
            headers=self._headers()
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Product update failed: {response.json()}")


def example_workflow():
    """
    Example workflow: Upload product image, get freshness, update product price
    """
    
    print("\n" + "="*70)
    print("FARMER-TO-CONSUMER: Product Freshness & Dynamic Pricing Workflow")
    print("="*70)
    
    try:
        # Initialize API client
        print("\n[1/5] Initializing API client...")
        api = FarmerAPI()
        
        # Example 1: Create a product
        print("\n[2/5] Creating a product...")
        product_data = {
            'name': 'Organic Tomatoes',
            'category': 'Vegetables',
            'price': 100.0,
            'quantity': 50,
        }
        product = api.create_product(**product_data)
        product_id = product['id']
        print(f"✅ Product created: ID={product_id}, Name={product['name']}")
        
        # Example 2: Predict freshness (would need actual image)
        print("\n[3/5] Getting freshness prediction...")
        print("Note: Skipping actual image upload (requires valid image file)")
        
        # Simulate freshness data
        freshness_data = {
            'freshness_score': 0.85,
            'estimated_remaining_days': 12,
            'freshness_category': 'Excellent'
        }
        print(f"✅ Freshness prediction:")
        print(f"   - Score: {freshness_data['freshness_score']}")
        print(f"   - Days Remaining: {freshness_data['estimated_remaining_days']}")
        print(f"   - Category: {freshness_data['freshness_category']}")
        
        # Example 3: Calculate dynamic price
        print("\n[4/5] Calculating dynamic price...")
        price_data = api.calculate_dynamic_price(
            base_price=product_data['price'],
            freshness_score=freshness_data['freshness_score']
        )
        print(f"✅ Price calculation:")
        print(f"   - Base Price: ₹{price_data['base_price']}")
        print(f"   - Freshness Score: {price_data['freshness_score']}")
        print(f"   - Suggested Price: ₹{price_data['suggested_price']}")
        print(f"   - Discount: {price_data['discount_percentage']}%")
        
        # Example 4: Update product with freshness and new price
        print("\n[5/5] Updating product with freshness score and dynamic price...")
        updated_product = api.update_product(
            product_id,
            price=price_data['suggested_price'],
            freshness_score=freshness_data['freshness_score']
        )
        print(f"✅ Product updated:")
        print(f"   - New Price: ₹{updated_product['price']}")
        print(f"   - Freshness Score: {updated_product.get('freshness_score', 'N/A')}")
        
        # Summary
        print("\n" + "="*70)
        print("WORKFLOW COMPLETED SUCCESSFULLY")
        print("="*70)
        print("\nSummary:")
        print(f"  Product: {updated_product['name']} ({updated_product['category']})")
        print(f"  Original Price: ₹{product_data['price']}")
        print(f"  Updated Price: ₹{updated_product['price']} ({price_data['discount_percentage']}% off)")
        print(f"  Freshness: {freshness_data['freshness_category']} ({freshness_data['freshness_score']})")
        print(f"  Days Remaining: {freshness_data['estimated_remaining_days']}")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def example_with_real_image(image_path):
    """
    Complete workflow with actual image processing
    
    Args:
        image_path: Path to product image file
    """
    
    print("\n" + "="*70)
    print("COMPLETE WORKFLOW: Image Upload → Freshness → Dynamic Price")
    print("="*70)
    
    try:
        # Initialize API client
        api = FarmerAPI()
        
        # Get freshness prediction from image
        print(f"\n[1/3] Analyzing image: {image_path}")
        freshness_data = api.predict_freshness(image_path)
        print(f"✅ Freshness Analysis:")
        print(f"   - Score: {freshness_data['freshness_score']}")
        print(f"   - Category: {freshness_data['freshness_category']}")
        print(f"   - Days Remaining: {freshness_data['estimated_remaining_days']}")
        
        # Calculate dynamic price
        print(f"\n[2/3] Calculating dynamic price...")
        base_price = 100.0
        price_data = api.calculate_dynamic_price(
            base_price=base_price,
            freshness_score=freshness_data['freshness_score']
        )
        print(f"✅ Price Calculation:")
        print(f"   - Base: ₹{price_data['base_price']}")
        print(f"   - Suggested: ₹{price_data['suggested_price']}")
        print(f"   - Discount: {price_data['discount_percentage']}%")
        
        # Create product with freshness
        print(f"\n[3/3] Creating product with freshness score...")
        product = api.create_product(
            name='Premium Tomatoes',
            category='Vegetables',
            price=price_data['suggested_price'],
            quantity=50,
            freshness_score=freshness_data['freshness_score']
        )
        print(f"✅ Product Created:")
        print(f"   - ID: {product['id']}")
        print(f"   - Name: {product['name']}")
        print(f"   - Price: ₹{product['price']}")
        print(f"   - Freshness: {product.get('freshness_score', 'N/A')}")
        
        print("\n" + "="*70)
        print("✅ WORKFLOW COMPLETED SUCCESSFULLY")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        # Use provided image path
        image_path = sys.argv[1]
        example_with_real_image(image_path)
    else:
        # Run simulated workflow
        example_workflow()
