"""
Test script for the Freshness Prediction API.

This script demonstrates how to test the freshness prediction endpoint.
"""

import requests
import json
from pathlib import Path

BASE_URL = 'http://localhost:8000'
API_URL = f'{BASE_URL}/api'


def get_token(username='bhuvan', password='password'):
    """
    Get authentication token.
    
    Replace with actual credentials.
    """
    response = requests.post(
        f'{API_URL}/token/',
        json={
            'username': username,
            'password': password
        }
    )
    
    if response.status_code == 200:
        return response.json()['access']
    else:
        print(f"Failed to get token: {response.json()}")
        return None


def test_predict_freshness(token, image_path):
    """
    Test the predict freshness endpoint with an image.
    """
    print(f"\n{'='*60}")
    print("Testing: Predict Freshness from Image")
    print(f"{'='*60}")
    
    if not Path(image_path).exists():
        print(f"❌ Image file not found: {image_path}")
        print("Please provide a valid image path")
        return
    
    with open(image_path, 'rb') as f:
        files = {'image': f}
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.post(
            f'{API_URL}/pricing/predict-freshness/',
            files=files,
            headers=headers
        )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    
    return response.json() if response.status_code == 200 else None


def test_dynamic_price(token, base_price=100.0, freshness_score=0.85):
    """
    Test the dynamic price calculation endpoint.
    """
    print(f"\n{'='*60}")
    print("Testing: Dynamic Price Calculation")
    print(f"{'='*60}")
    
    payload = {
        'base_price': base_price,
        'freshness_score': freshness_score
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    print(f"Request Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f'{API_URL}/pricing/dynamic-price/',
        json=payload,
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    
    return response.json() if response.status_code == 200 else None


def test_predict_shelf_life(token):
    """
    Test the predict shelf life endpoint (legacy).
    """
    print(f"\n{'='*60}")
    print("Testing: Predict Shelf Life (Legacy)")
    print(f"{'='*60}")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(
        f'{API_URL}/pricing/predict-shelf-life/',
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    
    return response.json() if response.status_code == 200 else None


def main():
    """
    Run all tests.
    """
    print("\n" + "="*60)
    print("Freshness Prediction API - Test Suite")
    print("="*60)
    
    # Get authentication token
    print("\n[1/4] Authenticating...")
    token = get_token()
    
    if not token:
        print("❌ Failed to authenticate")
        return
    
    print("✅ Authentication successful")
    
    # Test 1: Predict Shelf Life (Legacy)
    print("\n[2/4] Testing legacy shelf life prediction...")
    test_predict_shelf_life(token)
    
    # Test 2: Dynamic Price Calculation
    print("\n[3/4] Testing dynamic price calculation...")
    test_dynamic_price(token, base_price=100.0, freshness_score=0.85)
    test_dynamic_price(token, base_price=50.0, freshness_score=0.5)
    
    # Test 3: Predict Freshness from Image
    print("\n[4/4] Testing freshness prediction from image...")
    print("\nNote: To test image prediction, provide a valid image file")
    print("Example: python test_api.py path/to/image.jpg")
    
    print("\n" + "="*60)
    print("Test Suite Completed!")
    print("="*60)


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        # Test with provided image path
        image_path = sys.argv[1]
        token = get_token()
        if token:
            test_predict_freshness(token, image_path)
            test_dynamic_price(token)
    else:
        # Run full test suite
        main()
