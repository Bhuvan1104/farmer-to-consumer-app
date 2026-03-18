from pathlib import Path

import numpy as np

try:
    import cv2

    _IMPORT_ERROR = None
except Exception as exc:
    cv2 = None
    _IMPORT_ERROR = exc

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "freshness_model.h5"
_CLASSES = ["fresh", "medium", "rotten"]
_model = None


def _get_model():
    global _model
    if _IMPORT_ERROR is not None:
        raise RuntimeError(
            "Freshness model dependencies are missing. Install 'opencv-python'."
        ) from _IMPORT_ERROR

    if _model is None:
        try:
            from tensorflow.keras.models import load_model
        except Exception as exc:
            raise RuntimeError("TensorFlow is required for freshness model loading.") from exc
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

    return 160, 160


def _heuristic_score(image):
    rgb = image.astype(np.float32) / 255.0
    brightness = float(np.mean(rgb))

    channel_max = np.max(rgb, axis=2)
    channel_min = np.min(rgb, axis=2)
    saturation = float(np.mean(channel_max - channel_min))

    dark_ratio = float(np.mean(channel_max < 0.20))
    dull_ratio = float(np.mean((channel_max - channel_min) < 0.08))
    very_dark_ratio = float(np.mean(channel_max < 0.10))

    # Additional decay cues: brown coverage and blotchy darkness.
    hsv = cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
    brown_mask = cv2.inRange(hsv, (5, 45, 20), (28, 255, 185))
    brown_ratio = float(np.mean(brown_mask > 0))

    score = (0.45 * brightness) + (0.45 * saturation) + 0.20
    penalty = (
        (0.30 * dark_ratio)
        + (0.25 * dull_ratio)
        + (0.35 * brown_ratio)
        + (0.25 * very_dark_ratio)
    )
    return max(0.05, min(0.98, score - penalty))


def _label_from_score(score: float) -> str:
    if score >= 0.72:
        return "fresh"
    if score >= 0.45:
        return "medium"
    return "rotten"


def predict_freshness(image):
    if image is None or not hasattr(image, "shape"):
        raise ValueError("Invalid image data for freshness prediction.")

    if cv2 is None:
        score = float(_heuristic_score(image))
        return score, _label_from_score(score)

    try:
        model = _get_model()
        target_w, target_h = _get_model_target_size(model)

        img = cv2.resize(image, (target_w, target_h))
        img = img / 255.0
        img = np.expand_dims(img, axis=0)

        prediction = model.predict(img, verbose=0)[0]
        prediction = np.asarray(prediction, dtype=np.float32)

        if prediction.shape[0] != len(_CLASSES):
            raise RuntimeError("Freshness model output does not match expected classes")

        fresh_prob, medium_prob, rotten_prob = prediction.tolist()
        model_score = (fresh_prob * 0.95) + (medium_prob * 0.55) + (rotten_prob * 0.10)

        heuristic_score = _heuristic_score(cv2.resize(image, (160, 160)))
        confidence = float(np.max(prediction))

        if confidence < 0.65:
            freshness_score = (0.35 * model_score) + (0.65 * heuristic_score)
        else:
            freshness_score = (0.60 * model_score) + (0.40 * heuristic_score)

        # If image-level decay cues are strong, prevent unrealistically high score.
        if heuristic_score < 0.22:
            freshness_score = min(freshness_score, 0.32)
        elif heuristic_score < 0.30:
            freshness_score = min(freshness_score, 0.45)

        freshness_score = max(0.05, min(0.98, float(freshness_score)))
        label = _CLASSES[int(np.argmax(prediction))]
        return freshness_score, label
    except Exception:
        # Keep the API usable even if ML dependencies/model loading fail.
        score = float(_heuristic_score(cv2.resize(image, (160, 160))))
        return score, _label_from_score(score)
