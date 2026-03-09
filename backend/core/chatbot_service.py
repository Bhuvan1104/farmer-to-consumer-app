"""
NLP-Based Chatbot using scikit-learn

Uses TF-IDF vectorization and intent classification to provide support.
"""

import os
import json
import pickle
import logging
import numpy as np
from googletrans import Translator
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
        'hello','hi','hey','good morning','good afternoon','good evening',
        'how are you','is anyone there','can you help me','hello assistant',
        'hi chatbot','start chat','talk to assistant'
        ],
        'responses': [
        'Hello! 👋 I am your AI Farming Assistant. How can I help you today?',
        'Hi farmer! I can help with pricing, delivery, demand, freshness scoring and more.',
        'Welcome! Ask me anything about selling products, delivery logistics or market demand.',
        'Hello! Feel free to ask about pricing, orders, freshness or product management.'
        ]
        },

        'pricing': {
        'patterns': [
        'how to price my product','how should I price vegetables','what price should I sell for',
        'how much should I charge','best price for tomatoes','suggest price for my crop',
        'how to decide product price','pricing strategy','price recommendation',
        'market price suggestion','dynamic pricing system','calculate selling price',
        'what is best selling price','how to set price for vegetables'
        ],
        'responses': [
        'Our AI pricing tool suggests prices based on freshness, demand and seasonal trends.',
        'Upload a product image for freshness analysis and then use the pricing calculator.',
        'Higher demand and fresher produce allow you to set premium prices.',
        'You can check the pricing section in the dashboard for AI-based price suggestions.'
        ]
        },

        'freshness': {
        'patterns': [
        'how to check freshness','freshness score','product freshness analysis',
        'is my vegetable fresh','quality analysis','freshness detection',
        'analyze my product image','check product quality','how fresh is my crop'
        ],
        'responses': [
        'Upload a photo of your product to calculate its freshness score using AI.',
        'Freshness analysis categorizes produce as Excellent, Good, Fair, Poor or Not Fresh.',
        'Fresher products usually sell at higher prices and lower spoilage risk.',
        'Make sure your image is clear and taken in good lighting for best analysis.'
        ]
        },

        'orders': {
        'patterns': [
        'how to place order','create order','view my orders','order status',
        'track my order','order details','show my orders','where are my orders'
        ],
        'responses': [
        'You can view and manage orders in the Orders section of your dashboard.',
        'To track an order, open Orders and check the delivery status.',
        'All orders placed by consumers are visible in your Orders page.',
        'You can monitor order progress including pending, shipped and delivered.'
        ]
        },

        'delivery': {
        'patterns': [
        'delivery time','shipping time','how long delivery takes',
        'delivery cost','logistics calculation','spoilage risk',
        'transport risk','delivery distance','delivery estimate'
        ],
        'responses': [
        'Delivery time depends on distance between farmer and consumer.',
        'The system estimates spoilage risk based on distance and freshness score.',
        'Temperature-controlled transport can reduce spoilage risk.',
        'Check the logistics calculator to estimate delivery time and cost.'
        ]
        },

        'products': {
        'patterns': [
        'how to add product','create new product','list product for sale',
        'upload product','add vegetables to marketplace',
        'manage my products','edit product details'
        ],
        'responses': [
        'You can add products by clicking the Add Product button in your dashboard.',
        'Upload product images, price, quantity and description when listing a product.',
        'Better images and descriptions improve visibility in the marketplace.',
        'Keep product information updated to attract more buyers.'
        ]
        },

        'demand': {
        'patterns': [
        'market demand','demand forecast','how much demand for vegetables',
        'current market demand','demand level','product demand',
        'demand prediction'
        ],
        'responses': [
        'The demand index reflects current customer interest for a product.',
        'Higher demand allows higher pricing opportunities.',
        'Monitoring demand trends helps farmers adjust production and pricing.',
        'The system analyzes order data to estimate demand levels.'
        ]
        },

        'seasonal': {
        'patterns': [
        'seasonal demand','peak season','off season vegetables',
        'seasonal pricing','crop season demand','harvest season'
        ],
        'responses': [
        'Seasonal factors influence both demand and price.',
        'Peak seasons usually bring higher demand and better prices.',
        'Off-season crops may require discounts or promotions.',
        'Understanding seasonal trends helps maximize farmer profit.'
        ]
        },

        'payment': {
        'patterns': [
        'payment methods','how will i get paid','payment options',
        'upi payment','card payment','online payment','transaction history'
        ],
        'responses': [
        'The platform supports UPI, card payments and cash-on-delivery.',
        'All transactions can be tracked in the Orders or Payment history section.',
        'Payments are processed securely through the platform.',
        'You can view completed transactions in your account dashboard.'
        ]
        },

        'support': {
        'patterns': [
        'i need help','technical issue','website not working',
        'bug in system','problem with app','error occurred'
        ],
        'responses': [
        'I will try to help. Please describe the issue you are facing.',
        'If the problem continues, please contact the support team.',
        'Sometimes refreshing the page or clearing cache fixes the issue.',
        'Please provide details of the error so we can assist you.'
        ]
        },

        'farewell': {
        'patterns': [
        'bye','goodbye','see you','thank you','thanks','that is all'
        ],
        'responses': [
        'Goodbye! Happy farming! 🌱',
        'Thank you for using the Farmer Assistant.',
        'See you soon. Wishing you a great harvest!',
        'Take care and feel free to return anytime.'
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
        self.translator = Translator()
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
        """Train improved chatbot model."""
        logger.info("Training improved chatbot model...")

        training_patterns = []
        training_labels = []

        for intent_name, intent_data in self.intents.items():
            for pattern in intent_data['patterns']:
                training_patterns.append(pattern.lower())
                training_labels.append(intent_name)

                # 🔥 Automatically create variations
                training_patterns.append(pattern.lower() + " please")
                training_labels.append(intent_name)

                training_patterns.append("can you " + pattern.lower())
                training_labels.append(intent_name)

                training_patterns.append("tell me about " + pattern.lower())
                training_labels.append(intent_name)

        # 🔥 Improved pipeline
        self.model = Pipeline([
            ('tfidf', TfidfVectorizer(
                lowercase=True,
                stop_words='english',
                ngram_range=(1, 2),   # 🔥 BIGRAM SUPPORT
                max_features=3000
            )),
            ('classifier', MultinomialNB(alpha=0.1))
        ])

        self.model.fit(training_patterns, training_labels)
        self.is_trained = True

        logger.info("Improved chatbot trained successfully")

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
        try:
            if not self.is_trained:
                self._train_model()

            original_message = user_message.strip()

            # 🔥 Detect language
            detected = self.translator.detect(original_message)
            user_lang = detected.lang

            # 🔥 Translate to English if not English
            if user_lang != "en":
                translated = self.translator.translate(original_message, dest="en")
                message_for_model = translated.text.lower()
            else:
                message_for_model = original_message.lower()

            # Predict intent
            predicted_intent = self.model.predict([message_for_model])[0]
            probabilities = self.model.predict_proba([message_for_model])[0]
            confidence = float(max(probabilities))

            responses = self.intents[predicted_intent]['responses']
            response_text = np.random.choice(responses)

            # 🔥 Low confidence fallback
            if confidence < 0.15:
                response_text = (
                    "I may not fully understand, but I can help with:\n"
                    "• Pricing strategy\n"
                    "• Delivery logistics\n"
                    "• Demand forecasting\n"
                    "• Freshness scoring\n"
                    "• Order management\n\n"
                    "Could you rephrase your question?"
                )
                predicted_intent = "unknown"

            # 🔥 Translate back to user's language
            if user_lang != "en":
                translated_back = self.translator.translate(
                    response_text, dest=user_lang
                )
                response_text = translated_back.text

            return {
                "response": response_text,
                "intent": predicted_intent,
                "confidence": round(confidence, 2),
                "language": user_lang,
                "user_message": user_message,
                "timestamp": str(np.datetime64("now"))
            }

        except Exception as e:
            logger.error(f"Error in get_response: {str(e)}")
            return {
                "response": "Sorry, something went wrong. Please try again.",
                "intent": "error",
                "confidence": 0.0,
                "error": str(e)
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
