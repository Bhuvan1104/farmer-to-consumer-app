import os
import numpy as np
from PIL import Image


MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "models",
    "freshness_model.h5",
)
DEFAULT_MODEL_SIZE = (224, 224)
HEURISTIC_SIZE = (256, 256)
_model = None
_recent_model_scores = []
MODEL_FLAT_STD_THRESHOLD = 0.015
MODEL_FLAT_MIN_SAMPLES = 6
SAT_HIGH = 0.995
SAT_LOW = 0.005


def _get_model():
    global _model
    if _model is not None:
        return _model

    try:
        from tensorflow.keras.models import load_model

        _model = load_model(MODEL_PATH)
        return _model
    except Exception:
        return None


def _model_input_size(model):
    if model is None:
        return DEFAULT_MODEL_SIZE

    try:
        input_shape = model.input_shape
        if isinstance(input_shape, list):
            input_shape = input_shape[0]

        height = int(input_shape[1]) if input_shape[1] is not None else DEFAULT_MODEL_SIZE[1]
        width = int(input_shape[2]) if input_shape[2] is not None else DEFAULT_MODEL_SIZE[0]

        if height <= 0 or width <= 0:
            return DEFAULT_MODEL_SIZE

        return (width, height)
    except Exception:
        return DEFAULT_MODEL_SIZE


def _to_rgb_array(image, size):
    if image is None:
        raise ValueError("Image cannot be empty")

    if isinstance(image, Image.Image):
        pil_img = image.convert("RGB")
    else:
        arr = np.array(image)
        if arr.ndim == 2:
            arr = np.stack([arr, arr, arr], axis=-1)
        elif arr.ndim == 3 and arr.shape[2] == 4:
            arr = arr[:, :, :3]
        elif arr.ndim != 3 or arr.shape[2] != 3:
            raise ValueError("Unsupported image format")
        pil_img = Image.fromarray(arr.astype(np.uint8), mode="RGB")

    resized = pil_img.resize(size, Image.BILINEAR)
    return np.asarray(resized, dtype=np.float32)


def _model_score(model, rgb_img):
    if model is None:
        return None

    x = rgb_img / 255.0
    x = np.expand_dims(x, axis=0)
    pred = model.predict(x, verbose=0)[0][0]
    return float(pred)


def _heuristic_score(rgb_img):
    x = rgb_img / 255.0

    brightness = float(np.mean(x))
    channel_max = np.max(x, axis=2)
    channel_min = np.min(x, axis=2)
    saturation = float(np.mean(channel_max - channel_min))

    gx = np.abs(np.diff(x, axis=1)).mean()
    gy = np.abs(np.diff(x, axis=0)).mean()
    edge_density = float((gx + gy) / 2.0)
    texture = float(np.std(x))

    r = x[:, :, 0]
    g = x[:, :, 1]
    b = x[:, :, 2]
    hue_proxy = float(np.std(np.stack([r - g, g - b, b - r], axis=2)))

    dark_ratio = float(np.mean(channel_max < 0.24))
    low_sat_ratio = float(np.mean((channel_max - channel_min) < 0.08))
    brown_ratio = float(
        np.mean(
            (r > 0.18)
            & (g > 0.10)
            & (b < 0.30)
            & (r > g)
            & (g > b)
            & ((r - b) > 0.10)
        )
    )

    vivid_ratio = float(
        np.mean(
            (channel_max - channel_min > 0.25)
            & (channel_max > 0.28)
            & (channel_max < 0.92)
        )
    )

    positive = (
        0.28 * brightness
        + 0.24 * saturation
        + 0.18 * min(edge_density * 6.0, 1.0)
        + 0.15 * min(texture * 2.0, 1.0)
        + 0.15 * min(hue_proxy * 2.0, 1.0)
    )

    penalty = (0.28 * dark_ratio) + (0.22 * brown_ratio) + (0.16 * low_sat_ratio)
    bonus = 0.10 * vivid_ratio

    # Extra decay for strongly rotten-looking patterns.
    rot_signal = (0.55 * brown_ratio) + (0.45 * dark_ratio)
    if rot_signal > 0.22:
        extra_decay = min(0.22, ((rot_signal - 0.22) * 0.9) + (0.10 * low_sat_ratio))
    else:
        extra_decay = 0.0

    proxy = positive - penalty - extra_decay + bonus + 0.10
    return max(0.0, min(1.0, proxy))


def _update_model_stats(score):
    _recent_model_scores.append(float(score))
    if len(_recent_model_scores) > 20:
        _recent_model_scores.pop(0)


def _is_model_flat():
    if len(_recent_model_scores) < MODEL_FLAT_MIN_SAMPLES:
        return False

    recent = np.array(_recent_model_scores[-MODEL_FLAT_MIN_SAMPLES:], dtype=np.float32)
    return float(np.std(recent)) < MODEL_FLAT_STD_THRESHOLD


def predict_freshness(image):
    result = predict_freshness_debug(image)
    return result["freshness_score"]


def predict_freshness_debug(image):
    model = _get_model()

    model_size = _model_input_size(model)
    model_img = _to_rgb_array(image, model_size)
    heuristic_img = _to_rgb_array(image, HEURISTIC_SIZE)

    heuristic = _heuristic_score(heuristic_img)
    model_score = _model_score(model, model_img)

    if model_score is None:
        return {
            "freshness_score": float(heuristic),
            "model_score": None,
            "heuristic_score": float(heuristic),
            "model_flat_detected": None,
            "model_input_size": list(model_size),
            "mode": "heuristic_only",
        }

    model_score = max(0.0, min(1.0, model_score))
    _update_model_stats(model_score)

    if model_score >= SAT_HIGH or model_score <= SAT_LOW:
        return {
            "freshness_score": float(heuristic),
            "model_score": float(model_score),
            "heuristic_score": float(heuristic),
            "model_flat_detected": True,
            "model_input_size": list(model_size),
            "mode": "heuristic_saturated_model_bypass",
        }

    model_flat = _is_model_flat()
    if model_flat:
        return {
            "freshness_score": float(heuristic),
            "model_score": float(model_score),
            "heuristic_score": float(heuristic),
            "model_flat_detected": True,
            "model_input_size": list(model_size),
            "mode": "heuristic_flat_model_fallback",
        }

    final = (0.35 * model_score) + (0.65 * heuristic)
    final_score = max(0.0, min(1.0, float(final)))

    return {
        "freshness_score": final_score,
        "model_score": float(model_score),
        "heuristic_score": float(heuristic),
        "model_flat_detected": False,
        "model_input_size": list(model_size),
        "mode": "weighted_hybrid",
    }
