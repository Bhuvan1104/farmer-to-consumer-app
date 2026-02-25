"""
NLP-Based Chatbot using scikit-learn

Uses TF-IDF vectorization and intent classification to provide support.
"""

import os
import json
import pickle
import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.exceptions import NotFittedError
import warnings

warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class FarmerChatbot:
    """
    NLP-based chatbot for farmer support.
    
    Uses TF-IDF vectorization and Naive Bayes classification
    to understand user intent and provide appropriate responses.
    """
    
    # Intent definitions
    INTENTS = {
        'greeting': {
            'patterns': [
                'hello', 'hi', 'hey', 'good morning', 'good afternoon',
                'greetings', 'what is up', 'sup', 'howdy'
            ],
            'responses': [
                'Hello! Welcome to the Farmer App. How can I help you today?',
                'Hi there! What can I assist you with?',
                'Greetings! What do you need help with?',
                'Hey! Ready to help with your farming needs.'
            ]
        },
        'pricing': {
            'patterns': [
                'how to price product', 'pricing strategy', 'set price',
                'how much should I charge', 'price calculation', 'dynamic pricing',
                'what price', 'pricing help', 'price recommendation'
            ],
            'responses': [
                'Our dynamic pricing system considers freshness, demand, and seasonal factors. Use the pricing calculator in your dashboard!',
                'To price your products optimally, upload an image for freshness analysis, then use our AI pricing tool.',
                'The system suggests prices based on market conditions. You can always adjust manually.',
                'For best pricing results, update your product freshness and current market demand index.'
            ]
        },
        'freshness': {
            'patterns': [
                'freshness score', 'how fresh', 'product quality', 'analyze image',
                'freshness check', 'quality analysis', 'product condition',
                'produce quality', 'freshness analysis'
            ],
            'responses': [
                'Upload a photo of your product to get an instant freshness score (0-1 scale).',
                'Our ML model analyzes images to determine freshness categories: Excellent, Good, Fair, Poor, or Not Fresh.',
                'Freshness directly impacts pricing - fresher products get premium prices!',
                'Take a clear photo under good lighting for best freshness analysis results.'
            ]
        },
        'orders': {
            'patterns': [
                'create order', 'new order', 'place order', 'order management',
                'view orders', 'order status', 'track order', 'my orders'
            ],
            'responses': [
                'Orders are managed in your dashboard. Click "Orders" to view and manage.',
                'To track an order, go to the Orders section and view the delivery status.',
                'You can view all your orders and their status in the dashboard.',
                'Need to manage orders? Visit the Orders tab in your account.'
            ]
        },
        'delivery': {
            'patterns': [
                'delivery time', 'shipping', 'how long delivery', 'delivery cost',
                'delivery risk', 'spoilage', 'shipping time', 'when delivered'
            ],
            'responses': [
                'Delivery time depends on distance. Use our logistics calculator to estimate.',
                'Spoilage risk is calculated based on distance, freshness, and product type.',
                'Temperature-controlled delivery minimizes spoilage risk for sensitive products.',
                'The system estimates delivery time and shows spoilage risk before confirming orders.'
            ]
        },
        'payment': {
            'patterns': [
                'payment', 'how to pay', 'payment methods', 'transactions',
                'billing', 'invoice', 'charge', 'payment processing'
            ],
            'responses': [
                'We support multiple payment methods including credit cards and digital wallets.',
                'Payments are processed securely through our platform.',
                'For payment issues, contact our support team.',
                'You can view all transactions in your account history.'
            ]
        },
        'profile': {
            'patterns': [
                'update profile', 'change profile', 'profile settings',
                'account settings', 'edit profile', 'update information'
            ],
            'responses': [
                'Visit the Profile section in your dashboard to update your information.',
                'Your profile includes farm details, location, and product preferences.',
                'Make sure your location is accurate for better delivery estimates.',
                'Update your profile regularly to maintain accurate farm information.'
            ]
        },
        'products': {
            'patterns': [
                'add product', 'create product', 'list product', 'new product',
                'manage products', 'product listing', 'upload product'
            ],
            'responses': [
                'To add a product, go to "Add Product" and fill in the details.',
                'Upload product images for freshness analysis and better listings.',
                'Include harvesting date and storage conditions for accurate freshness analysis.',
                'Your products appear in the marketplace once added to your dashboard.'
            ]
        },
        'demand': {
            'patterns': [
                'demand index', 'market demand', 'how much demand',
                'current demand', 'adjust demand', 'demand level'
            ],
            'responses': [
                'Demand index (1-10) reflects current market interest. Monitor order volume to estimate it.',
                'Higher demand (8-10) justifies premium pricing. Lower demand (1-3) may need discounts.',
                'Check recent orders to gauge demand for your products.',
                'The system suggests discounts during low demand periods.'
            ]
        },
        'seasonal': {
            'patterns': [
                'seasonal', 'season', 'off season', 'peak season',
                'seasonal pricing', 'time of year'
            ],
            'responses': [
                'Seasonal factors affect pricing. Peak seasons justify price increases.',
                'Off-season products may require discounts due to supply abundance.',
                'The system automatically adjusts for seasonal factors.',
                'Plan your harvesting around seasonal demand patterns for better profits.'
            ]
        },
        'support': {
            'patterns': [
                'help', 'support', 'issue', 'problem', 'need help',
                'bug', 'not working', 'error', 'trouble'
            ],
            'responses': [
                'I\'m here to help! What specific issue are you facing?',
                'For technical issues, please contact our support team with details.',
                'Try refreshing the page or clearing your browser cache.',
                'If you continue experiencing issues, please report them to our support team.'
            ]
        },
        'location': {
            'patterns': [
                'location', 'address', 'farm location', 'where', 'coordinates',
                'GPS', 'region', 'area'
            ],
            'responses': [
                'Your location is crucial for delivery calculation and customer discovery.',
                'Enter your farm\'s exact address or coordinates for accurate logistics.',
                'Customers search based on proximity, so an accurate location is important.',
                'You can update your location in the Profile settings.'
            ]
        },
        'feedback': {
            'patterns': [
                'feedback', 'suggestion', 'feature request', 'improvement',
                'review', 'rate', 'rating'
            ],
            'responses': [
                'We love feedback! Please share your suggestions with our support team.',
                'Your reviews help us improve the platform for all users.',
                'Feature requests are always welcome - send them to our development team.',
                'Rate your experience to help us provide better service.'
            ]
        },
        'farewell': {
            'patterns': [
                'bye', 'goodbye', 'see you', 'thanks', 'thank you',
                'that\'s all', 'done', 'exit'
            ],
            'responses': [
                'Goodbye! Happy farming! 😊',
                'Thank you for using Farmer App. See you soon!',
                'Have a great day! Feel free to reach out anytime.',
                'Bye! Good luck with your harvest!'
            ]
        }
    }
    
    MODEL_PATH = os.path.join(
        os.path.dirname(__file__),
        'models',
        'chatbot_model.pkl'
    )
    
    INTENTS_PATH = os.path.join(
        os.path.dirname(__file__),
        'models',
        'chatbot_intents.json'
    )
    
    def __init__(self):
        """Initialize chatbot."""
        self.model = None
        self.vectorizer = None
        self.intents = self.INTENTS
        self.is_trained = False
        self._load_model()
    
    def _load_model(self):
        """Load trained model from disk."""
        try:
            if os.path.exists(self.MODEL_PATH):
                with open(self.MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                self.is_trained = True
                logger.info("Chatbot model loaded successfully")
            else:
                logger.warning(f"Model not found at {self.MODEL_PATH}")
                self._train_model()
        
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self._train_model()
    
    def _train_model(self):
        """Train chatbot model on intents."""
        logger.info("Training chatbot model...")
        
        # Prepare training data
        training_patterns = []
        training_labels = []
        
        for intent_name, intent_data in self.intents.items():
            for pattern in intent_data['patterns']:
                training_patterns.append(pattern.lower())
                training_labels.append(intent_name)
        
        # Create pipeline
        self.model = Pipeline([
            ('tfidf', TfidfVectorizer(lowercase=True, stop_words='english')),
            ('classifier', MultinomialNB())
        ])
        
        # Train model
        self.model.fit(training_patterns, training_labels)
        self.is_trained = True
        
        logger.info(f"Chatbot trained on {len(self.intents)} intents")
        
        # Save model
        self._save_model()
    
    def _save_model(self):
        """Save trained model to disk."""
        try:
            os.makedirs(os.path.dirname(self.MODEL_PATH), exist_ok=True)
            
            with open(self.MODEL_PATH, 'wb') as f:
                pickle.dump(self.model, f)
            
            logger.info(f"Chatbot model saved to {self.MODEL_PATH}")
        
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
    
    def get_response(self, user_message):
        """
        Get chatbot response to user message.
        
        Args:
            user_message: User's input message
        
        Returns:
            Dict with response, intent, and confidence
        """
        try:
            if not self.is_trained:
                # attempt to train if not trained
                self._train_model()

            # Classify intent
            message_lower = user_message.lower().strip()
            try:
                predicted_intent = self.model.predict([message_lower])[0]
                # Get confidence
                probabilities = self.model.predict_proba([message_lower])[0]
                confidence = float(max(probabilities))
            except (NotFittedError, Exception) as inner_exc:
                # If model not fitted or other model error, attempt retrain once
                logger.warning(f"Model inference error, retraining: {inner_exc}")
                try:
                    self._train_model()
                    predicted_intent = self.model.predict([message_lower])[0]
                    probabilities = self.model.predict_proba([message_lower])[0]
                    confidence = float(max(probabilities))
                except Exception as retry_exc:
                    logger.error(f"Retry training/inference failed: {retry_exc}")
                    raise retry_exc
            
            # Get response
            responses = self.intents[predicted_intent]['responses']
            response = np.random.choice(responses)
            
            # Check if confidence is too low (might be off-topic)
            if confidence < 0.3:
                response = "I'm not sure I understand. Can you rephrase that? I can help with pricing, delivery, orders, products, and more!"
                predicted_intent = 'unknown'
            
            return {
                'response': response,
                'intent': predicted_intent,
                'confidence': round(confidence, 2),
                'user_message': user_message,
                'timestamp': str(np.datetime64('now'))
            }
        
        except Exception as e:
            logger.error(f"Error in get_response: {str(e)}")
            return {
                'response': "Sorry, I encountered an error. Please try again or contact support.",
                'intent': 'error',
                'confidence': 0.0,
                'user_message': user_message,
                'error': str(e)
            }
    
    def get_available_intents(self):
        """Get list of available intents and their patterns."""
        return {
            intent: {
                'description': f'{intent.capitalize()} related queries',
                'patterns': data['patterns'][:3],  # First 3 patterns as examples
                'num_patterns': len(data['patterns'])
            }
            for intent, data in self.intents.items()
        }
    
    def handle_conversation(self, messages):
        """
        Handle a multi-turn conversation.
        
        Args:
            messages: List of dicts with 'role' and 'content'
        
        Returns:
            List of responses
        """
        responses = []
        
        for message in messages:
            if message.get('role') == 'user':
                response = self.get_response(message['content'])
                responses.append(response)
        
        return responses
    
    def add_custom_intent(self, intent_name, patterns, responses):
        """
        Add custom intent to chatbot.
        
        Args:
            intent_name: Name of the intent
            patterns: List of pattern strings
            responses: List of response strings
        """
        self.intents[intent_name] = {
            'patterns': patterns,
            'responses': responses
        }
        
        # Retrain model
        self._train_model()
        logger.info(f"Added custom intent: {intent_name}")
    
    def get_model_info(self):
        """Get information about the chatbot model."""
        if not self.is_trained:
            return {'status': 'Not trained'}
        
        total_patterns = sum(len(data['patterns']) for data in self.intents.values())
        
        return {
            'status': 'Ready',
            'model_type': 'TF-IDF + Naive Bayes',
            'num_intents': len(self.intents),
            'total_patterns': total_patterns,
            'intents': list(self.intents.keys()),
            'path': self.MODEL_PATH
        }


# Convenience function
def chat(user_message):
    """
    Quick convenience function to get chatbot response.
    
    Args:
        user_message: User's input message
    
    Returns:
        Chatbot response
    """
    chatbot = FarmerChatbot()
    return chatbot.get_response(user_message)
