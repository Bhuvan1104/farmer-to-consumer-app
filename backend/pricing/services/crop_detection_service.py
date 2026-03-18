import logging
import json
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

try:
    import cv2
    _IMPORT_ERROR = None
except Exception as exc:
    cv2 = None
    _IMPORT_ERROR = exc

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "crop_model.h5"
YOLO_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "yolo_crop_detector.pt"
CLASS_MAP_PATH = Path(__file__).resolve().parents[1] / "models" / "crop_classes.json"
DATASET_CROPS_DIR = Path(__file__).resolve().parents[2] / "dataset" / "crops"

# Fallback only when dataset folders are unavailable.
_FALLBACK_CLASSES = [
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

_model = None
_yolo_model = None


def _load_classes():
    """
    Prefer class_indices saved at train time to guarantee label order.
    """
    try:
        if CLASS_MAP_PATH.exists():
            with CLASS_MAP_PATH.open("r", encoding="utf-8") as f:
                class_indices = json.load(f)

            if isinstance(class_indices, dict) and class_indices:
                ordered = sorted(
                    class_indices.items(),
                    key=lambda item: int(item[1]),
                )
                classes = [str(name).strip().lower() for name, _ in ordered]
                if classes:
                    return classes
    except Exception as exc:
        logger.warning("Failed to load crop classes from class map file: %s", exc)

    # Fallback to directory-name ordering used by flow_from_directory.
    try:
        if DATASET_CROPS_DIR.exists():
            classes = sorted([p.name for p in DATASET_CROPS_DIR.iterdir() if p.is_dir()])
            if classes:
                return [c.strip().lower() for c in classes]
    except Exception as exc:
        logger.warning("Failed to load crop classes from dataset directory: %s", exc)

    return _FALLBACK_CLASSES


_CLASSES = _load_classes()


def get_supported_crops():
    return [c.strip().lower() for c in _CLASSES]


def _get_thresholds(class_count):
    """
    Strict thresholds to avoid confident wrong labels.
    """
    if class_count <= 10:
        return 0.62, 0.12
    if class_count <= 25:
        return 0.60, 0.10
    return 0.58, 0.09


def _get_model():
    global _model
    if _IMPORT_ERROR is not None:
        raise RuntimeError(
            "Crop detection dependencies are missing. Install 'opencv-python'."
        ) from _IMPORT_ERROR

    if _model is None:
        try:
            from tensorflow.keras.models import load_model
        except Exception as exc:
            raise RuntimeError("TensorFlow is required for crop detection model loading.") from exc
        _model = load_model(str(MODEL_PATH), compile=False)

    return _model


def _get_yolo_model():
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model
    if not YOLO_MODEL_PATH.exists():
        return None
    try:
        from ultralytics import YOLO

        _yolo_model = YOLO(str(YOLO_MODEL_PATH))
        return _yolo_model
    except Exception as exc:
        logger.warning("Failed to load YOLO crop detector: %s", exc)
        return None


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


def _prepare_image(image, target_w, target_h):
    # Keep preprocessing aligned with training pipeline (resize + rescale only).
    return cv2.resize(image, (target_w, target_h), interpolation=cv2.INTER_AREA)


def _banana_like_score(crop_img):
    if cv2 is None or crop_img is None or crop_img.size == 0:
        return 0.0
    hsv = cv2.cvtColor(crop_img, cv2.COLOR_RGB2HSV)
    # Broad yellow band in HSV.
    yellow_mask = cv2.inRange(hsv, (15, 45, 45), (40, 255, 255))
    # Rotten bananas are often brown/dark-orange.
    brown_mask = cv2.inRange(hsv, (5, 40, 20), (25, 255, 180))
    # Banana tips can include green; keep as weak signal.
    green_mask = cv2.inRange(hsv, (35, 35, 35), (85, 255, 255))

    yellow_ratio = float(np.mean(yellow_mask > 0))
    brown_ratio = float(np.mean(brown_mask > 0))
    green_ratio = float(np.mean(green_mask > 0))
    h, w = crop_img.shape[:2]
    aspect = float(max(w, h) / max(1, min(w, h)))

    # Banana tends to be peel-color dominant (yellow/brown) and elongated.
    elongation = max(0.0, min(1.0, (aspect - 1.2) / 1.8))
    peel_ratio = min(1.0, yellow_ratio + (0.85 * brown_ratio))
    score = (0.60 * peel_ratio) + (0.08 * green_ratio) + (0.32 * elongation)
    return float(max(0.0, min(1.0, score)))


def _postprocess_yolo_crop(crop_name, conf, crop_img):
    name = str(crop_name).strip().lower()
    confidence = float(conf)

    # Reject weak YOLO guesses to avoid confidently wrong labels.
    if confidence < 0.62:
        return "unknown", confidence

    banana_score = _banana_like_score(crop_img)
    banana_confusions = {"capsicum", "bell pepper", "paprika", "pear", "beetroot", "sweetpotato", "potato"}
    if name in banana_confusions and banana_score >= 0.18:
        return "banana", max(confidence, banana_score)

    return name, confidence


def _postprocess_any_crop(crop_name, conf, crop_img):
    """
    Shared correction layer for both TensorFlow and YOLO outputs.
    """
    name = str(crop_name).strip().lower()
    confidence = float(conf)
    banana_score = _banana_like_score(crop_img)

    # If banana visual signature is strong, prefer banana over known confusions.
    strong_banana_confusions = {
        "beetroot",
        "sweetpotato",
        "capsicum",
        "bell pepper",
        "paprika",
        "pear",
        "potato",
    }
    if banana_score >= 0.14 and name in strong_banana_confusions:
        return "banana", max(confidence, banana_score)

    # Very strong banana signature should override almost anything except clearly non-banana citrus.
    if banana_score >= 0.24 and name not in {"orange", "lemon"}:
        return "banana", max(confidence, banana_score)

    return name, confidence


def detect_crop(image):
    try:
        model = _get_model()
        target_w, target_h = _get_model_target_size(model)

        prepared = _prepare_image(image, target_w, target_h)
        img = prepared.astype(np.float32) / 255.0
        img = np.expand_dims(img, axis=0)

        prediction = model.predict(img, verbose=0)[0]
        prediction = np.asarray(prediction, dtype=np.float32)

        if prediction.ndim != 1 or prediction.size == 0:
            logger.warning("Crop model returned invalid prediction tensor shape: %s", prediction.shape)
            return "unknown", 0.0

        class_count = len(_CLASSES)
        if prediction.size != class_count:
            logger.warning(
                "Crop model output size (%s) does not match class list size (%s)",
                prediction.size,
                class_count,
            )
            return "unknown", float(np.max(prediction))

        ranked = np.argsort(prediction)[::-1]
        top_idx = int(ranked[0])
        second_idx = int(ranked[1]) if prediction.size > 1 else top_idx
        confidence = float(prediction[top_idx])
        margin = float(prediction[top_idx] - prediction[second_idx]) if prediction.size > 1 else confidence

        min_confidence, min_margin = _get_thresholds(len(_CLASSES))
        if confidence < min_confidence or margin < min_margin:
            logger.info(
                "Crop confidence/margin below threshold: conf=%.3f margin=%.3f",
                confidence,
                margin,
            )
            return "unknown", confidence

        if 0 <= top_idx < len(_CLASSES):
            crop = _CLASSES[top_idx].strip().lower()
        else:
            logger.warning("Crop model predicted out-of-range index: %s", top_idx)
            crop = "unknown"

        crop, confidence = _postprocess_any_crop(crop, confidence, image)
        return crop, confidence
    except Exception as tf_exc:
        logger.warning("TensorFlow crop detection unavailable, trying YOLO fallback: %s", tf_exc)

    yolo_model = _get_yolo_model()
    if yolo_model is None:
        return "unknown", 0.0

    try:
        results = yolo_model.predict(image, verbose=False)
        if not results:
            return "unknown", 0.0
        boxes = getattr(results[0], "boxes", None)
        if boxes is None or len(boxes) == 0:
            return "unknown", 0.0

        names = getattr(results[0], "names", {}) or {}
        best_box = None
        best_area = -1.0
        for box in boxes:
            xyxy = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls_idx = int(box.cls[0].cpu().numpy())
            x1, y1, x2, y2 = [int(v) for v in xyxy]
            area = max(0, x2 - x1) * max(0, y2 - y1)
            if area > best_area:
                crop_name = str(names.get(cls_idx, f"class_{cls_idx}")).strip().lower()
                best_box = (crop_name, conf, x1, y1, x2, y2)
                best_area = area
        if best_box is None:
            return "unknown", 0.0
        crop_name, conf, x1, y1, x2, y2 = best_box
        h, w = image.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        crop_img = image[y1:y2, x1:x2] if (x2 > x1 and y2 > y1) else image
        final_name, final_conf = _postprocess_yolo_crop(crop_name, conf, crop_img)
        final_name, final_conf = _postprocess_any_crop(final_name, final_conf, crop_img)
        return final_name, final_conf
    except Exception as yolo_exc:
        logger.warning("YOLO crop fallback failed: %s", yolo_exc)
        return "unknown", 0.0
