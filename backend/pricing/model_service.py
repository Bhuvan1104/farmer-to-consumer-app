from pathlib import Path
import logging
import os

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent / 'models'
MODEL_PATH = MODEL_DIR / 'freshness_model.h5'


class FreshnessPredictor:

    _model = None
    IMAGE_SIZE = (128, 128)

    @classmethod
    def load_model(cls):
        if cls._model is not None:
            return cls._model

        try:
            # Lazy import here
            from tensorflow import keras

            MODEL_DIR.mkdir(parents=True, exist_ok=True)

            if MODEL_PATH.exists():
                logger.info(f"Loading model from {MODEL_PATH}")
                cls._model = keras.models.load_model(MODEL_PATH)
                return cls._model

            logger.warning("Model not found. Creating demo model.")
            cls._model = cls._create_demo_model()
            cls._model.save(str(MODEL_PATH))

            return cls._model

        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise

    @staticmethod
    def _create_demo_model():
        from tensorflow import keras

        model = keras.Sequential([
            keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 3)),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.Conv2D(64, (3, 3), activation='relu'),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.Conv2D(64, (3, 3), activation='relu'),
            keras.layers.Flatten(),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.5),
            keras.layers.Dense(1, activation='sigmoid')
        ])

        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )

        return model

    @staticmethod
    def preprocess_image(image_path):
        import cv2
        import numpy as np

        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Failed to read image from {image_path}")

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, FreshnessPredictor.IMAGE_SIZE)
        img = img.astype('float32') / 255.0
        img = np.expand_dims(img, axis=0)

        return img

    @classmethod
    def predict(cls, image_path):
        model = cls.load_model()
        processed_image = cls.preprocess_image(image_path)

        prediction = model.predict(processed_image, verbose=0)
        freshness_score = float(prediction[0][0])

        estimated_remaining_days = int(freshness_score * 14)
        if freshness_score > 0 and estimated_remaining_days == 0:
            estimated_remaining_days = 1

        return {
            'freshness_score': round(freshness_score, 2),
            'estimated_remaining_days': estimated_remaining_days,
            'freshness_category': cls._get_freshness_category(freshness_score)
        }

    @staticmethod
    def _get_freshness_category(score):
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