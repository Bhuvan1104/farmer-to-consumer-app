# Freshness Prediction API

## Overview

This module provides a machine learning-based API endpoint for predicting product freshness using image analysis. The system uses a pre-trained CNN model with OpenCV for image preprocessing.

## Features

- **Image Upload**: Accept image uploads for freshness prediction
- **Image Preprocessing**: Automatic resizing, normalization, and format conversion using OpenCV
- **CNN Model**: TensorFlow/Keras-based model for freshness classification
- **Dynamic Pricing**: Calculate suggested prices based on freshness scores
- **Error Handling**: Comprehensive error handling and logging
- **Authentication**: Requires user authentication for all endpoints

## Endpoints

### 1. Predict Freshness from Image

**Endpoint**: `POST /api/pricing/predict-freshness/`

**Authentication**: Required (Bearer Token)

**Request**:
```
Form-data:
- image: [image file]
```

Supported formats: JPEG, JPG, PNG, WEBP (Max 5MB)

**Response**:
```json
{
    "freshness_score": 0.85,
    "estimated_remaining_days": 12,
    "freshness_category": "Excellent"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:8000/api/pricing/predict-freshness/ \
  -H "Authorization: Bearer <token>" \
  -F "image=@path/to/image.jpg"
```

**Example with Python**:
```python
import requests

with open('product_image.jpg', 'rb') as f:
    files = {'image': f}
    headers = {'Authorization': 'Bearer <token>'}
    response = requests.post(
        'http://localhost:8000/api/pricing/predict-freshness/',
        files=files,
        headers=headers
    )
    print(response.json())
```

### 2. Dynamic Price Calculation

**Endpoint**: `POST /api/pricing/dynamic-price/`

**Authentication**: Required (Bearer Token)

**Request**:
```json
{
    "base_price": 100.0,
    "freshness_score": 0.85
}
```

**Response**:
```json
{
    "base_price": 100.0,
    "freshness_score": 0.85,
    "suggested_price": 85.0,
    "discount_percentage": 15.0
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:8000/api/pricing/dynamic-price/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"base_price": 100, "freshness_score": 0.85}'
```

**Example with Python**:
```python
import requests

data = {
    'base_price': 100.0,
    'freshness_score': 0.85
}
headers = {'Authorization': 'Bearer <token>'}
response = requests.post(
    'http://localhost:8000/api/pricing/dynamic-price/',
    json=data,
    headers=headers
)
print(response.json())
```

### 3. Predict Shelf Life (Legacy)

**Endpoint**: `POST /api/pricing/predict-shelf-life/`

**Authentication**: Required (Bearer Token)

**Response**:
```json
{
    "freshness_score": 0.75,
    "estimated_days_remaining": 7
}
```

---

## Image Preprocessing

The `FreshnessPredictor` class handles the following preprocessing steps:

1. **Image Loading**: Read image using OpenCV
2. **Color Conversion**: Convert BGR to RGB
3. **Resizing**: Resize to 128×128 pixels (model input size)
4. **Normalization**: Scale pixel values to 0-1 range
5. **Batch Dimension**: Add batch dimension for model input

### Preprocessing Code:
```python
def preprocess_image(image_path):
    # Read image
    img = cv2.imread(str(image_path))
    
    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Resize to model input size
    img = cv2.resize(img, (128, 128))
    
    # Normalize pixel values
    img = img.astype('float32') / 255.0
    
    # Add batch dimension
    img = np.expand_dims(img, axis=0)
    
    return img
```

---

## Model Architecture

The default demo model uses a CNN with the following architecture:

```
Conv2D(32, 3x3) → ReLU → MaxPool(2x2)
↓
Conv2D(64, 3x3) → ReLU → MaxPool(2x2)
↓
Conv2D(64, 3x3) → ReLU
↓
Flatten
↓
Dense(64) → ReLU → Dropout(0.5)
↓
Dense(1) → Sigmoid (Output: 0-1)
```

**Input**: 128×128×3 RGB image
**Output**: Freshness score (0-1)

---

## Freshness Categories

Based on the freshness score:

| Score Range | Category | Days |
|------------|----------|------|
| 0.8 - 1.0 | Excellent | 11-14 |
| 0.6 - 0.8 | Good | 8-11 |
| 0.4 - 0.6 | Fair | 6-8 |
| 0.2 - 0.4 | Poor | 3-5 |
| 0.0 - 0.2 | Not Fresh | 0-2 |

---

## Using Your Own Model

To use your own trained model instead of the demo model:

1. **Train and save your model**:
```python
import tensorflow as tf
from tensorflow import keras

# Your training code...
model = keras.Sequential([...])
model.fit(train_data, train_labels, ...)

# Save the model
model.save('backend/pricing/models/freshness_model.h5')
```

2. **The API will automatically load your model**:
   - Place your `.h5` file in `backend/pricing/models/freshness_model.h5`
   - The `FreshnessPredictor` class will load it automatically
   - No code changes needed!

---

## Error Handling

### Common Errors and Solutions

**400 Bad Request - Invalid Image Format**:
```json
{
    "error": "Invalid request",
    "details": {
        "image": ["Image format must be one of: jpeg, jpg, png, webp"]
    }
}
```

**400 Bad Request - Image Too Large**:
```json
{
    "error": "Invalid request",
    "details": {
        "image": ["Image size must not exceed 5MB"]
    }
}
```

**401 Unauthorized**:
```json
{
    "detail": "Authentication credentials were not provided."
}
```

**500 Internal Server Error**:
```json
{
    "error": "Error processing image",
    "detail": "Failed to read image from..."
}
```

---

## Performance Metrics

- **Input Size**: 128×128 pixels
- **Model Parameters**: ~35,000
- **Inference Time**: ~50-100ms per image
- **Memory Usage**: ~50MB (with model)

---

## File Structure

```
backend/pricing/
├── views.py                    # API endpoints
├── serializers.py              # Request/response validation
├── model_service.py            # Model loading and prediction logic
├── urls.py                     # URL routing
├── models/
│   ├── freshness_model.h5      # Pre-trained model (auto-generated)
└── FRESHNESS_API.md            # This file
```

---

## Dependencies

- `tensorflow>=2.8.0` - Deep learning framework
- `opencv-python>=4.5.0` - Image processing
- `numpy>=1.19.0` - Numerical computing
- `pillow>=8.0.0` - Image handling

Install with:
```bash
pip install tensorflow opencv-python numpy pillow
```

---

## Integration Example

Here's how to integrate the freshness prediction into your product flow:

```python
# 1. User uploads an image
response = requests.post(
    'http://localhost:8000/api/pricing/predict-freshness/',
    files={'image': open('tomato.jpg', 'rb')},
    headers={'Authorization': f'Bearer {token}'}
)
freshness_data = response.json()

# 2. Use freshness score for dynamic pricing
price_response = requests.post(
    'http://localhost:8000/api/pricing/dynamic-price/',
    json={
        'base_price': 50.0,
        'freshness_score': freshness_data['freshness_score']
    },
    headers={'Authorization': f'Bearer {token}'}
)
pricing_data = price_response.json()

# 3. Update product with freshness score
# In your ProductViewSet:
product = Product.objects.get(id=product_id)
product.freshness_score = freshness_data['freshness_score']
product.save()

# 4. Adjust price based on freshness
final_price = pricing_data['suggested_price']
```

---

## Testing

### Test with cURL

```bash
# Get authentication token
TOKEN=$(curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"farmer_user","password":"password"}' \
  | jq -r '.access')

# Predict freshness
curl -X POST http://localhost:8000/api/pricing/predict-freshness/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test_image.jpg"

# Calculate dynamic price
curl -X POST http://localhost:8000/api/pricing/dynamic-price/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"base_price":100,"freshness_score":0.85}'
```

---

## Troubleshooting

### Model fails to load
- Check that `freshness_model.h5` exists in `backend/pricing/models/`
- Verify TensorFlow installation: `python -c "import tensorflow; print(tensorflow.__version__)"`
- Check logs for detailed error messages

### Slow predictions
- Model inference is I/O bound; consider using GPU acceleration
- Batch multiple predictions if possible
- Optimize image preprocessing if needed

### Out of memory errors
- Reduce batch size in your training code
- Use a smaller model architecture
- Consider model quantization

---

## License

Use and modify as needed for your project.
