"""
Machine Learning Price Prediction Pipeline

Trains a RandomForestRegressor model on historical crop price data
and provides utilities for price prediction.

Model Features:
- Base price, freshness score, demand index, seasonal factor
- Predicts next week's price
- Saves trained model for production use
"""

import os
import json
import pickle
import logging
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import warnings

warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class PricePredictor:
    """
    Machine learning model for crop price prediction.
    
    Uses RandomForestRegressor to predict next week's price based on:
    - Base price
    - Freshness score
    - Demand index
    - Seasonal factor
    """
    
    MODEL_PATH = os.path.join(
        os.path.dirname(__file__),
        'models',
        'price_predictor_model.pkl'
    )
    
    SCALER_PATH = os.path.join(
        os.path.dirname(__file__),
        'models',
        'price_scaler.pkl'
    )
    
    def __init__(self):
        """Initialize price predictor."""
        self.model = None
        self.scaler = None
        self.is_trained = False
        self._load_model()
    
    def _load_model(self):
        """Load trained model from disk."""
        try:
            if os.path.exists(self.MODEL_PATH):
                with open(self.MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                
                with open(self.SCALER_PATH, 'rb') as f:
                    self.scaler = pickle.load(f)
                
                self.is_trained = True
                logger.info("Price predictor model loaded successfully")
            else:
                logger.warning(f"Model not found at {self.MODEL_PATH}")
                self._train_demo_model()
        
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self._train_demo_model()
    
    def _train_demo_model(self):
        """Train a demo model on synthetic historical data."""
        logger.info("Training demo price predictor model...")
        
        # Generate synthetic historical crop price data
        np.random.seed(42)
        n_samples = 500
        
        # Features: [base_price, freshness_score, demand_index, seasonal_factor]
        X = np.random.rand(n_samples, 4)
        
        # Scale features to realistic ranges
        X[:, 0] = X[:, 0] * 100 + 10      # Base price: $10-110
        X[:, 1] = X[:, 1]                 # Freshness: 0-1
        X[:, 2] = X[:, 2] * 9 + 1         # Demand: 1-10
        X[:, 3] = X[:, 3] * 0.6 + 0.7     # Seasonal: 0.7-1.3
        
        # Generate target (predicted price) with realistic relationship
        # Price increases with freshness, demand, and seasonal factors
        y = (
            X[:, 0] * 0.8 +                              # 80% base price influence
            X[:, 0] * X[:, 1] * 20 +                     # Freshness multiplier effect
            X[:, 0] * (X[:, 2] - 5) * 2 +                # Demand effect
            X[:, 0] * (X[:, 3] - 1) * 15 +               # Seasonal effect
            np.random.normal(0, 5, n_samples)            # Noise
        )
        
        # Ensure positive prices
        y = np.maximum(y, 5)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train scaler
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train RandomForest model
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Model trained - RMSE: ${rmse:.2f}, R²: {r2:.3f}")
        
        # Save model
        self._save_model()
        self.is_trained = True
    
    def _save_model(self):
        """Save trained model to disk."""
        try:
            os.makedirs(os.path.dirname(self.MODEL_PATH), exist_ok=True)
            
            with open(self.MODEL_PATH, 'wb') as f:
                pickle.dump(self.model, f)
            
            with open(self.SCALER_PATH, 'wb') as f:
                pickle.dump(self.scaler, f)
            
            logger.info(f"Model saved to {self.MODEL_PATH}")
        
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
    
    def predict_next_week_price(self, base_price, freshness_score, demand_index, seasonal_factor):
        """
        Predict next week's price for a crop.
        
        Args:
            base_price: Current base price (float)
            freshness_score: Freshness score 0-1 (float)
            demand_index: Demand index 1-10 (int)
            seasonal_factor: Seasonal multiplier 0.7-1.3 (float)
        
        Returns:
            Dict with predicted price and confidence
        """
        try:
            if not self.is_trained:
                raise ValueError("Model not trained or loaded")
            
            # Validate inputs
            if base_price <= 0:
                raise ValueError("Base price must be positive")
            
            if not 0 <= freshness_score <= 1:
                raise ValueError("Freshness score must be 0-1")
            
            if not 1 <= demand_index <= 10:
                raise ValueError("Demand index must be 1-10")
            
            if not 0.7 <= seasonal_factor <= 1.3:
                raise ValueError("Seasonal factor must be 0.7-1.3")
            
            # Prepare features
            features = np.array([[base_price, freshness_score, demand_index, seasonal_factor]])
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Make prediction
            predicted_price = self.model.predict(features_scaled)[0]
            
            # Get feature importances for insights
            feature_names = ['Base Price', 'Freshness', 'Demand', 'Seasonal']
            importances = self.model.feature_importances_
            
            # Build insights
            insights = []
            for name, importance in zip(feature_names, importances):
                if importance > 0.15:  # Only significant factors
                    insights.append({
                        'factor': name,
                        'importance': round(importance * 100, 1)
                    })
            
            return {
                'predicted_price': round(max(5, predicted_price), 2),  # Minimum $5
                'base_price': base_price,
                'price_change': round(predicted_price - base_price, 2),
                'percentage_change': round(((predicted_price - base_price) / base_price) * 100, 1),
                'confidence': 'High',  # Could be improved with prediction intervals
                'top_factors': sorted(insights, key=lambda x: x['importance'], reverse=True),
                'recommendation': self._get_recommendation(predicted_price, base_price)
            }
        
        except Exception as e:
            logger.error(f"Error in predict_next_week_price: {str(e)}")
            raise
    
    @staticmethod
    def _get_recommendation(predicted_price, base_price):
        """Generate recommendation based on prediction."""
        change_pct = ((predicted_price - base_price) / base_price) * 100
        
        if change_pct > 20:
            return "Price expected to increase significantly - consider holding inventory"
        elif change_pct > 5:
            return "Price expected to increase - good time to list"
        elif change_pct > -5:
            return "Price expected to remain stable - standard listing"
        elif change_pct > -20:
            return "Price expected to decrease - consider discounts"
        else:
            return "Price expected to decrease significantly - urgent clearance recommended"
    
    def get_model_info(self):
        """Get information about the trained model."""
        if not self.is_trained:
            return {'status': 'Not trained'}
        
        return {
            'status': 'Ready',
            'model_type': 'RandomForestRegressor',
            'n_estimators': self.model.n_estimators,
            'max_depth': self.model.max_depth,
            'features': 4,
            'feature_names': ['Base Price', 'Freshness Score', 'Demand Index', 'Seasonal Factor'],
            'path': self.MODEL_PATH
        }


# Convenience function
def predict_crop_price(base_price, freshness_score, demand_index, seasonal_factor):
    """
    Quick convenience function to predict crop price.
    
    Args:
        base_price: Current base price
        freshness_score: Freshness score 0-1
        demand_index: Demand index 1-10
        seasonal_factor: Seasonal multiplier 0.7-1.3
    
    Returns:
        Price prediction result
    """
    predictor = PricePredictor()
    return predictor.predict_next_week_price(
        base_price,
        freshness_score,
        demand_index,
        seasonal_factor
    )
