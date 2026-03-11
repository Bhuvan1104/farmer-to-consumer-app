from pathlib import Path
import logging

import numpy as np

logger = logging.getLogger(__name__)

try:
    import cv2
    from tensorflow.keras.models import load_model

    _IMPORT_ERROR = None
except Exception as exc:
    cv2 = None
    load_model = None
    _IMPORT_ERROR = exc

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "crop_model.h5"
# Must match training class order from flow_from_directory (alphabetical by folder name).
_CLASSES = [
    "apple",
    "avocado",
    "banana",
    "cabbage",
    "carrot",
    "cucumber",
    "onion",
    "orange",
    "tomato",
]
MIN_CONFIDENCE = 0.70
_model = None


def _get_model():
    global _model
    if _IMPORT_ERROR is not None:
        raise RuntimeError(
            "Crop detection dependencies are missing. Install 'opencv-python' and 'tensorflow'."
        ) from _IMPORT_ERROR

    if _model is None:
        # compile=False avoids optimizer deserialization issues across TF versions.
        _model = load_model(str(MODEL_PATH), compile=False)

    return _model


def _get_model_target_size(model):
    try:
        input_shape = model.input_shape
        if isinstance(input_shape, list):
            input_shape = input_shape[0]

        height = int(input_shape[1])
        width = int(input_shape[2])

        if height > 0 and width > 0:
            return width, height
    except Exception:
        pass

    return 224, 224


def detect_crop(image):
    model = _get_model()
    target_w, target_h = _get_model_target_size(model)

    img = cv2.resize(image, (target_w, target_h))
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    prediction = model.predict(img, verbose=0)[0]
    index = int(np.argmax(prediction))
    confidence = float(np.max(prediction))

    # Avoid confidently mislabeling unsupported crops such as mango.
    if confidence < MIN_CONFIDENCE:
        logger.info("Crop confidence below threshold: %.3f", confidence)
        return "unknown", confidence

    if 0 <= index < len(_CLASSES):
        crop = _CLASSES[index]
    else:
        logger.warning("Crop model predicted out-of-range index: %s", index)
        crop = "unknown"

    return crop, confidence
