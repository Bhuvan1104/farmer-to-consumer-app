"""
NLP chatbot service for farmer support.

This module keeps a lightweight intent classifier and a deterministic
keyword fallback so responses remain useful even when model confidence is low.
"""

import hashlib
import json
import logging
import os
import pickle
import random
import re
import asyncio
import inspect
from datetime import datetime, timezone

try:
    from googletrans import Translator
except Exception:
    Translator = None

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)


class _NoOpTranslation:
    def __init__(self, text, lang="en"):
        self.text = text
        self.lang = lang


class _FallbackTranslator:
    def detect(self, text):
        return _NoOpTranslation(text=text, lang="en")

    def translate(self, text, dest="en"):
        return _NoOpTranslation(text=text, lang=dest)


def _clean_text(text: str) -> str:
    text = str(text or "").lower().strip()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class FarmerChatbot:
    SUPPORTED_LANGS = {"en", "hi", "te", "ta"}
    INTENTS = {
        "greeting": {
            "patterns": [
                "hello",
                "hi",
                "hey",
                "good morning",
                "good afternoon",
                "good evening",
                "how are you",
                "can you help me",
            ],
            "responses": [
                "Hello! I am your AI farming assistant. How can I help you today?",
                "Hi! I can help with pricing, freshness, delivery, and orders.",
            ],
        },
        "pricing": {
            "patterns": [
                "price my product",
                "best price",
                "pricing strategy",
                "price recommendation",
                "market price",
                "selling price",
            ],
            "responses": [
                "Use Pricing to calculate dynamic and advanced prices from freshness, demand, and season.",
                "Upload product image first, then run pricing suggestions for better recommendations.",
            ],
        },
        "freshness": {
            "patterns": [
                "freshness score",
                "check freshness",
                "quality analysis",
                "freshness detection",
                "analyze product image",
            ],
            "responses": [
                "Upload a clear produce image in Pricing to get freshness score and estimated shelf life.",
                "For better freshness results, use a clear image with plain background and good lighting.",
            ],
        },
        "orders": {
            "patterns": [
                "place order",
                "order status",
                "track order",
                "my orders",
            ],
            "responses": [
                "You can track and manage orders in the Orders page.",
                "Open Orders to view status like pending, accepted, shipped, or delivered.",
            ],
        },
        "delivery": {
            "patterns": [
                "delivery time",
                "delivery cost",
                "shipping",
                "logistics",
                "spoilage risk",
            ],
            "responses": [
                "Delivery metrics depend on distance, freshness, and selected address.",
                "Use Delivery page to estimate time, route efficiency, and risk.",
            ],
        },
        "products": {
            "patterns": [
                "add product",
                "edit product",
                "list product",
                "upload product",
            ],
            "responses": [
                "Use Add Product to list new produce with image, quantity, and price.",
                "You can edit product details from Product Detail page.",
            ],
        },
        "demand": {
            "patterns": [
                "market demand",
                "demand forecast",
                "demand index",
            ],
            "responses": [
                "Demand index helps adjust pricing and expected sales potential.",
                "Higher demand usually supports better prices.",
            ],
        },
        "seasonal": {
            "patterns": [
                "seasonal impact",
                "season demand",
                "off season",
                "peak season",
            ],
            "responses": [
                "Seasonal factors affect demand and pricing multipliers.",
                "Use advanced pricing to include season-based adjustments.",
            ],
        },
        "payment": {
            "patterns": [
                "payment method",
                "how will i get paid",
                "transaction history",
                "upi payment",
            ],
            "responses": [
                "Payments and transaction details are available in your account/order flow.",
                "You can track completed transactions from order history.",
            ],
        },
        "support": {
            "patterns": [
                "technical issue",
                "bug",
                "error",
                "not working",
                "help",
            ],
            "responses": [
                "Please share the exact error message and page name, and I will guide you step-by-step.",
                "Try refreshing once and retrying. If issue remains, share screenshot and logs.",
            ],
        },
        "farewell": {
            "patterns": ["bye", "goodbye", "thanks", "thank you"],
            "responses": [
                "Goodbye. Wishing you a great harvest!",
                "Thanks for using FarmDirect assistant.",
            ],
        },
    }

    KEYWORD_HINTS = {
        "pricing": ["price", "pricing", "cost", "sell", "rate"],
        "freshness": ["fresh", "freshness", "rotten", "shelf", "quality"],
        "orders": ["order", "orders", "status", "track"],
        "delivery": ["delivery", "ship", "shipping", "distance", "route"],
        "products": ["product", "products", "add product", "edit product", "listing"],
        "demand": ["demand", "forecast"],
        "seasonal": ["season", "seasonal", "off season", "peak season"],
        "payment": ["payment", "upi", "transaction", "paid"],
        "support": ["error", "issue", "bug", "problem", "not working"],
        "greeting": ["hello", "hi", "hey"],
        "farewell": ["bye", "thanks", "thank you"],
    }

    MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "chatbot_model.pkl")
    META_PATH = os.path.join(os.path.dirname(__file__), "models", "chatbot_model_meta.json")

    def __init__(self):
        self.model = None
        self.intents = self.INTENTS
        self.is_trained = False
        self.translator = Translator() if Translator is not None else _FallbackTranslator()
        self._load_or_train()

    def _intents_hash(self):
        payload = json.dumps(self.intents, sort_keys=True, ensure_ascii=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _load_or_train(self):
        os.makedirs(os.path.dirname(self.MODEL_PATH), exist_ok=True)
        wanted_hash = self._intents_hash()

        try:
            if os.path.exists(self.MODEL_PATH) and os.path.exists(self.META_PATH):
                with open(self.META_PATH, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                if meta.get("intents_hash") == wanted_hash:
                    with open(self.MODEL_PATH, "rb") as f:
                        self.model = pickle.load(f)
                    self.is_trained = True
                    return
        except Exception as exc:
            logger.warning("Chatbot model load failed, retraining: %s", exc)

        self._train_model()
        self._save_model(wanted_hash)

    def _train_model(self):
        patterns = []
        labels = []
        for intent, data in self.intents.items():
            for p in data["patterns"]:
                c = _clean_text(p)
                if not c:
                    continue
                patterns.extend([c, f"{c} please", f"can you {c}", f"tell me about {c}"])
                labels.extend([intent, intent, intent, intent])

        self.model = Pipeline(
            steps=[
                (
                    "tfidf",
                    TfidfVectorizer(lowercase=True, ngram_range=(1, 2), max_features=4000),
                ),
                ("classifier", MultinomialNB(alpha=0.08)),
            ]
        )
        self.model.fit(patterns, labels)
        self.is_trained = True

    def _save_model(self, intents_hash):
        try:
            with open(self.MODEL_PATH, "wb") as f:
                pickle.dump(self.model, f)
            with open(self.META_PATH, "w", encoding="utf-8") as f:
                json.dump({"intents_hash": intents_hash}, f, indent=2, ensure_ascii=True)
        except Exception as exc:
            logger.warning("Unable to save chatbot model/meta: %s", exc)

    def _translate_in(self, text):
        return self._translate_in_with_preference(text, None)

    def _resolve_translation_obj(self, maybe_obj):
        if inspect.isawaitable(maybe_obj):
            try:
                return asyncio.run(maybe_obj)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                try:
                    return loop.run_until_complete(maybe_obj)
                finally:
                    loop.close()
        return maybe_obj

    def _normalize_lang(self, lang):
        lang = str(lang or "en").strip().lower()
        if "-" in lang:
            lang = lang.split("-", 1)[0]
        if lang not in self.SUPPORTED_LANGS:
            return "en"
        return lang

    def _translate_in_with_preference(self, text, preferred_language=None):
        preferred = self._normalize_lang(preferred_language) if preferred_language else None
        if preferred and preferred != "en":
            try:
                translated = self.translator.translate(text, dest="en")
                translated = self._resolve_translation_obj(translated)
                return _clean_text(translated.text), preferred
            except Exception:
                return _clean_text(text), preferred

        try:
            detected = self._resolve_translation_obj(self.translator.detect(text))
            lang = getattr(detected, "lang", "en") or "en"
        except Exception:
            lang = "en"
        lang = self._normalize_lang(lang)

        if lang != "en":
            try:
                translated = self._resolve_translation_obj(self.translator.translate(text, dest="en"))
                return _clean_text(translated.text), lang
            except Exception:
                return _clean_text(text), lang
        return _clean_text(text), "en"

    def _translate_out(self, text, lang):
        lang = self._normalize_lang(lang)
        if lang == "en":
            return text
        try:
            translated = self._resolve_translation_obj(self.translator.translate(text, dest=lang))
            return translated.text
        except Exception:
            return text

    def _keyword_intent(self, text):
        score_by_intent = {}
        for intent, kws in self.KEYWORD_HINTS.items():
            score = sum(1 for kw in kws if kw in text)
            if score > 0:
                score_by_intent[intent] = score
        if not score_by_intent:
            return None, 0.0
        best = max(score_by_intent, key=score_by_intent.get)
        confidence = min(0.95, 0.35 + 0.15 * score_by_intent[best])
        return best, confidence

    def get_response(self, user_message, preferred_language=None):
        try:
            if not self.is_trained:
                self._load_or_train()

            original = str(user_message or "").strip()
            if not original:
                return {
                    "response": "Please type a message so I can help.",
                    "intent": "unknown",
                    "confidence": 0.0,
                    "language": "en",
                    "user_message": user_message,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }

            message_en, user_lang = self._translate_in_with_preference(original, preferred_language)

            predicted_intent = None
            confidence = 0.0
            if self.model is not None:
                predicted_intent = self.model.predict([message_en])[0]
                probs = self.model.predict_proba([message_en])[0]
                confidence = float(max(probs))

            # Keyword fallback or override for weak predictions.
            kw_intent, kw_conf = self._keyword_intent(message_en)
            if predicted_intent is None or confidence < 0.45:
                if kw_intent:
                    predicted_intent, confidence = kw_intent, max(confidence, kw_conf)

            if predicted_intent not in self.intents:
                predicted_intent = "support"
                confidence = max(confidence, 0.35)
            predicted_intent = str(predicted_intent)

            responses = self.intents[predicted_intent]["responses"]
            response_text = random.choice(responses)

            if confidence < 0.30:
                predicted_intent = "unknown"
                response_text = (
                    "I can help with pricing, freshness, delivery, orders, products, and demand. "
                    "Please rephrase your question with a little more detail."
                )

            response_text = self._translate_out(response_text, user_lang)

            return {
                "response": response_text,
                "intent": predicted_intent,
                "confidence": round(float(confidence), 2),
                "language": user_lang,
                "user_message": user_message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as exc:
            logger.exception("Error in get_response: %s", exc)
            return {
                "response": "Sorry, something went wrong. Please try again.",
                "intent": "error",
                "confidence": 0.0,
                "error": str(exc),
            }

    def get_available_intents(self):
        return {
            intent: {
                "description": f"{intent.capitalize()} related queries",
                "patterns": data["patterns"][:3],
                "num_patterns": len(data["patterns"]),
            }
            for intent, data in self.intents.items()
        }

    def handle_conversation(self, messages, preferred_language=None):
        responses = []
        for message in messages:
            if message.get("role") == "user":
                responses.append(
                    self.get_response(
                        message.get("content", ""),
                        preferred_language=message.get("language") or preferred_language,
                    )
                )
        return responses

    def add_custom_intent(self, intent_name, patterns, responses):
        self.intents[intent_name] = {"patterns": patterns, "responses": responses}
        self._train_model()
        self._save_model(self._intents_hash())

    def get_model_info(self):
        total_patterns = sum(len(data["patterns"]) for data in self.intents.values())
        return {
            "status": "Ready" if self.is_trained else "Not trained",
            "model_type": "TF-IDF + Naive Bayes + keyword fallback",
            "num_intents": len(self.intents),
            "total_patterns": total_patterns,
            "intents": list(self.intents.keys()),
            "path": self.MODEL_PATH,
        }


def chat(user_message):
    chatbot = FarmerChatbot()
    return chatbot.get_response(user_message)
