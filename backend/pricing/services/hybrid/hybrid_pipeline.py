import json
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np

from ..shelf_life_service import predict_shelf_life

try:
    import cv2
except Exception:  # pragma: no cover
    cv2 = None

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    YOLO = None

try:
    import joblib
except Exception:  # pragma: no cover
    joblib = None


MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
YOLO_WEIGHTS_PATH = MODELS_DIR / "yolo_crop_detector.pt"
FRESHNESS_MODEL_PATH = MODELS_DIR / "freshness_tl_model.h5"
FRESHNESS_LABELS_PATH = MODELS_DIR / "freshness_labels.json"
SHELF_LIFE_MODEL_PATH = MODELS_DIR / "shelf_life_regressor.joblib"
SHELF_LIFE_META_PATH = MODELS_DIR / "shelf_life_regressor_meta.json"

_FRESHNESS_DEFAULT_LABELS = ["fresh", "medium", "rotten"]

_yolo_model = None
_freshness_model = None
_freshness_labels = None
_shelf_life_bundle = None
_shelf_life_meta = None


def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _load_yolo_model():
    global _yolo_model
    if _yolo_model is None and YOLO is not None and YOLO_WEIGHTS_PATH.exists():
        _yolo_model = YOLO(str(YOLO_WEIGHTS_PATH))
    return _yolo_model


def _load_freshness_model_and_labels():
    global _freshness_model, _freshness_labels
    if _freshness_model is None and FRESHNESS_MODEL_PATH.exists():
        try:
            from tensorflow.keras.models import load_model
        except Exception as exc:
            raise RuntimeError("TensorFlow is required for hybrid freshness model loading.") from exc
        _freshness_model = load_model(str(FRESHNESS_MODEL_PATH), compile=False)

    if _freshness_labels is None:
        _freshness_labels = _load_json(FRESHNESS_LABELS_PATH, _FRESHNESS_DEFAULT_LABELS)

    return _freshness_model, _freshness_labels


def _load_shelf_life_bundle():
    global _shelf_life_bundle, _shelf_life_meta
    if _shelf_life_bundle is None and joblib is not None and SHELF_LIFE_MODEL_PATH.exists():
        _shelf_life_bundle = joblib.load(str(SHELF_LIFE_MODEL_PATH))
    if _shelf_life_meta is None:
        _shelf_life_meta = _load_json(SHELF_LIFE_META_PATH, {})
    return _shelf_life_bundle, _shelf_life_meta


def hybrid_pipeline_available() -> bool:
    return YOLO_WEIGHTS_PATH.exists() and FRESHNESS_MODEL_PATH.exists()


def _largest_bbox(result) -> Optional[Tuple[int, int, int, int, str, float]]:
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return None

    names = getattr(result, "names", {}) or {}
    best = None
    best_area = -1.0

    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        conf = float(box.conf[0].cpu().numpy())
        cls_idx = int(box.cls[0].cpu().numpy())

        x1, y1, x2, y2 = [int(v) for v in xyxy]
        area = max(0, x2 - x1) * max(0, y2 - y1)
        if area > best_area:
            crop_name = str(names.get(cls_idx, f"class_{cls_idx}")).strip().lower()
            best = (x1, y1, x2, y2, crop_name, conf)
            best_area = area

    return best


def _predict_freshness(crop_rgb: np.ndarray) -> Tuple[float, str]:
    model, labels = _load_freshness_model_and_labels()

    if model is None:
        raise RuntimeError("Freshness TL model is not available")

    input_shape = model.input_shape
    if isinstance(input_shape, list):
        input_shape = input_shape[0]

    h = int(input_shape[1]) if input_shape[1] else 224
    w = int(input_shape[2]) if input_shape[2] else 224

    img = cv2.resize(crop_rgb, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)

    probs = np.asarray(model.predict(img, verbose=0)[0], dtype=np.float32)
    idx = int(np.argmax(probs))

    label = str(labels[idx]).strip().lower() if idx < len(labels) else "medium"

    # Soft freshness scoring from class probabilities.
    label_weights = {"fresh": 0.95, "medium": 0.55, "rotten": 0.10}
    score = 0.0
    for i, p in enumerate(probs):
        l = str(labels[i]).strip().lower() if i < len(labels) else "medium"
        score += float(p) * float(label_weights.get(l, 0.5))

    score = float(max(0.05, min(0.98, score)))

    if score >= 0.72:
        category = "Fresh"
    elif score >= 0.45:
        category = "Medium"
    else:
        category = "Low"

    return score, category


def _visual_features(crop_rgb: np.ndarray, area_ratio: float) -> Dict[str, float]:
    rgb = crop_rgb.astype(np.float32) / 255.0
    brightness = float(np.mean(rgb))
    saturation = float(np.mean(np.max(rgb, axis=2) - np.min(rgb, axis=2)))
    return {
        "brightness": brightness,
        "saturation": saturation,
        "area_ratio": float(area_ratio),
    }


def _predict_shelf_life_days(crop_type: str, freshness_score: float, features: Dict[str, float]) -> int:
    bundle, meta = _load_shelf_life_bundle()

    if bundle is None:
        # Fallback to existing shelf-life service.
        result = predict_shelf_life(freshness_score, crop_type)
        return int(result.get("remaining_days", 0))

    model = bundle.get("model") if isinstance(bundle, dict) else bundle
    encoder = bundle.get("crop_encoder") if isinstance(bundle, dict) else None

    numeric = np.array([
        freshness_score,
        features.get("brightness", 0.0),
        features.get("saturation", 0.0),
        features.get("area_ratio", 0.0),
    ], dtype=np.float32).reshape(1, -1)

    # Newer training stores a sklearn pipeline that accepts raw feature DataFrame.
    if hasattr(model, "predict") and hasattr(model, "named_steps"):
        import pandas as pd

        row = pd.DataFrame(
            [
                {
                    "crop_type": crop_type,
                    "freshness_score": float(freshness_score),
                    "brightness": float(features.get("brightness", 0.0)),
                    "saturation": float(features.get("saturation", 0.0)),
                    "area_ratio": float(features.get("area_ratio", 0.0)),
                }
            ]
        )
        pred = float(model.predict(row)[0])
        return int(max(0, round(pred)))

    if encoder is not None:
        crop_vec = encoder.transform([[crop_type]])
        if hasattr(crop_vec, "toarray"):
            crop_vec = crop_vec.toarray()
        x = np.concatenate([numeric, crop_vec], axis=1)
    else:
        x = numeric

    pred = float(model.predict(x)[0])
    return int(max(0, round(pred)))


def predict_hybrid_pipeline(image_rgb: np.ndarray) -> Dict[str, object]:
    if cv2 is None:
        raise RuntimeError("opencv-python is required for hybrid inference")

    yolo_model = _load_yolo_model()
    if yolo_model is None:
        raise RuntimeError("YOLO detector weights are not available")

    yolo_results = yolo_model.predict(image_rgb, verbose=False)
    if not yolo_results:
        raise RuntimeError("YOLO did not return detection results")

    best = _largest_bbox(yolo_results[0])
    if best is None:
        raise ValueError("No supported produce object detected in image")

    x1, y1, x2, y2, crop_type, det_conf = best
    h, w = image_rgb.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    if x2 <= x1 or y2 <= y1:
        raise ValueError("Invalid crop bounding box detected")

    crop_rgb = image_rgb[y1:y2, x1:x2]
    area_ratio = float(((x2 - x1) * (y2 - y1)) / max(1, w * h))

    freshness_score, freshness_category = _predict_freshness(crop_rgb)
    features = _visual_features(crop_rgb, area_ratio)
    shelf_life_days = _predict_shelf_life_days(crop_type, freshness_score, features)

    return {
        "crop_type": crop_type,
        "freshness_score": round(float(freshness_score), 3),
        "freshness_category": freshness_category,
        "estimated_shelf_life_days": int(shelf_life_days),
        "detection_confidence": round(float(det_conf), 3),
        "used_hybrid_pipeline": True,
    }
