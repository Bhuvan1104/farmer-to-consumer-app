import numpy as np
import cv2
import tensorflow as tf
from tensorflow import keras
from pathlib import Path
import logging
import os

logger = logging.getLogger(__name__)

# Model path configuration
MODEL_DIR = Path(__file__).resolve().parent / 'models'
MODEL_PATH = MODEL_DIR / 'freshness_model.h5'


class FreshnessPredictor:
    """
    A class to handle image preprocessing and freshness prediction using a CNN model.
    """
    
    _model = None
    IMAGE_SIZE = (128, 128)
    
    @classmethod
    def load_model(cls):
        """
        Load the pre-trained freshness prediction model.
        If the model doesn't exist, creates a dummy model for demonstration.
        """
        if cls._model is not None:
            return cls._model
        
        try:
            # Ensure model directory exists
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            
            # Try to load existing model
            if MODEL_PATH.exists():
                logger.info(f"Loading model from {MODEL_PATH}")
                cls._model = keras.models.load_model(MODEL_PATH)
                return cls._model
            
            # Create a demo model if it doesn't exist
            logger.warning(f"Model not found at {MODEL_PATH}. Creating demo model.")
            cls._model = cls._create_demo_model()
            cls._model.save(str(MODEL_PATH))
            logger.info(f"Demo model saved to {MODEL_PATH}")
            
            return cls._model
        
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            # Return demo model as fallback
            return cls._create_demo_model()
    
    @staticmethod
    def _create_demo_model():
        """
        Create a simple demonstration CNN model for freshness prediction.
        Replace this with your actual trained model.
        """
        model = keras.Sequential([
            keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 3)),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.Conv2D(64, (3, 3), activation='relu'),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.Conv2D(64, (3, 3), activation='relu'),
            keras.layers.Flatten(),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.5),
            keras.layers.Dense(1, activation='sigmoid')  # Freshness score (0-1)
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    @staticmethod
    def preprocess_image(image_path):
        """
        Preprocess the image for model prediction.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Preprocessed image as numpy array (1, 128, 128, 3)
        """
        try:
            # Read image
            img = cv2.imread(str(image_path))
            
            if img is None:
                raise ValueError(f"Failed to read image from {image_path}")
            
            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize to model input size
            img = cv2.resize(img, FreshnessPredictor.IMAGE_SIZE)
            
            # Normalize pixel values to 0-1
            img = img.astype('float32') / 255.0
            
            # Add batch dimension
            img = np.expand_dims(img, axis=0)
            
            logger.info(f"Image preprocessed successfully. Shape: {img.shape}")
            return img
        
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    @classmethod
    def predict(cls, image_path):
        """
        Predict freshness score and estimated remaining days for an image.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with freshness_score and estimated_remaining_days
        """
        try:
            # Load model
            model = cls.load_model()
            
            # Preprocess image
            processed_image = cls.preprocess_image(image_path)
            
            # Make prediction
            prediction = model.predict(processed_image, verbose=0)
            freshness_score = float(prediction[0][0])
            
            # Estimate remaining days (0-1 freshness → 0-14 days)
            # This is a simple estimation; refine based on your use case
            estimated_remaining_days = int(freshness_score * 14)
            
            # Ensure minimum days if freshness > 0
            if freshness_score > 0 and estimated_remaining_days == 0:
                estimated_remaining_days = 1
            
            logger.info(
                f"Prediction completed. Freshness: {freshness_score:.2f}, "
                f"Days: {estimated_remaining_days}"
            )
            
            return {
                'freshness_score': round(freshness_score, 2),
                'estimated_remaining_days': estimated_remaining_days,
                'freshness_category': cls._get_freshness_category(freshness_score)
            }
        
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise
    
    @staticmethod
    def _get_freshness_category(score):
        """
        Categorize freshness based on score.
        
        Args:
            score: Freshness score (0-1)
            
        Returns:
            Freshness category string
        """
        if score >= 0.8:
            return 'Excellent'
        elif score >= 0.6:
            return 'Good'
        elif score >= 0.4:
            return 'Fair'
        elif score >= 0.2:
            return 'Poor'
        else:
            return 'Not Fresh'
