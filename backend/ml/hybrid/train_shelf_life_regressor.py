import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import argparse
import random
from typing import Optional

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.base import RegressorMixin

try:
    from xgboost import XGBRegressor
except Exception:
    XGBRegressor = None

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_PATH = BASE_DIR / "dataset" / "shelf_life" / "shelf_life_training.csv"
CROPS_DIR = BASE_DIR / "dataset" / "crops"

MODELS_DIR = BASE_DIR / "pricing" / "models"

MODEL_PATH = MODELS_DIR / "shelf_life_regressor.joblib"

META_PATH = MODELS_DIR / "shelf_life_regressor_meta.json"
GENERATED_DATASET_PATH = BASE_DIR / "dataset" / "shelf_life" / "generated_shelf_life_training.csv"

TARGET_COL = "shelf_life_days"

FEATURES = ["crop_type", "freshness_score", "brightness", "saturation", "area_ratio"]

PROFILES = {
    "fast": {
        "algorithm": "xgboost",
        "n_estimators": 180,
        "max_depth": 6,
        "learning_rate": 0.08,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "max_per_class": 120,
        "use_image_stats": False,
    },
    "balanced": {
        "algorithm": "xgboost",
        "n_estimators": 300,
        "max_depth": 7,
        "learning_rate": 0.06,
        "subsample": 0.95,
        "colsample_bytree": 0.95,
        "max_per_class": 180,
        "use_image_stats": False,
    },
    "quality": {
        "algorithm": "xgboost",
        "n_estimators": 450,
        "max_depth": 8,
        "learning_rate": 0.05,
        "subsample": 1.0,
        "colsample_bytree": 1.0,
        "max_per_class": 260,
        "use_image_stats": True,
    },
}


def parse_args():
    parser = argparse.ArgumentParser(description="Train shelf-life regression model")
    parser.add_argument("--profile", choices=PROFILES.keys(), default="balanced")
    parser.add_argument("--dataset", type=str, default=None, help="Optional explicit CSV path")
    return parser.parse_args()


def make_onehot_encoder():
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def make_regressor(cfg) -> RegressorMixin:
    use_xgb = cfg.get("algorithm") == "xgboost" and XGBRegressor is not None
    if use_xgb:
        return XGBRegressor(
            n_estimators=int(cfg["n_estimators"]),
            max_depth=int(cfg["max_depth"]),
            learning_rate=float(cfg["learning_rate"]),
            subsample=float(cfg["subsample"]),
            colsample_bytree=float(cfg["colsample_bytree"]),
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1,
            tree_method="hist",
        )

    # Fallback if xgboost is unavailable.
    return HistGradientBoostingRegressor(
        max_depth=8,
        learning_rate=0.06,
        max_iter=260,
        random_state=42,
    )


def _iter_images(folder: Path):
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            yield p


def _find_dataset(explicit_path: Optional[str]):
    candidates = []
    if explicit_path:
        candidates.append(Path(explicit_path))

    candidates.extend(
        [
            DATASET_PATH,
            BASE_DIR / "dataset" / "shelf_life_training.csv",
            BASE_DIR / "ml" / "hybrid" / "shelf_life_training.csv",
            GENERATED_DATASET_PATH,
        ]
    )

    for p in candidates:
        if p.exists() and p.is_file():
            return p
    return None


def _estimate_image_stats(image_path: Path):
    try:
        import cv2  # local import keeps script usable even when cv2 is unavailable
    except Exception:
        cv2 = None

    if cv2 is None:
        return None

    img = cv2.imread(str(image_path))
    if img is None:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    brightness = float(np.mean(rgb))
    saturation = float(np.mean(np.max(rgb, axis=2) - np.min(rgb, axis=2)))
    return brightness, saturation


def _base_shelf_life(crop: str) -> int:
    known = {
        "banana": 6,
        "mango": 7,
        "apple": 20,
        "orange": 14,
        "tomato": 7,
        "onion": 25,
        "potato": 30,
        "cucumber": 6,
        "carrot": 16,
        "cabbage": 12,
    }
    return known.get(crop.lower(), 10)


def _build_generated_dataset(cfg):
    if not CROPS_DIR.exists():
        raise FileNotFoundError(
            f"Shelf-life dataset not found, and crops folder unavailable for generation: {CROPS_DIR}"
        )

    random.seed(42)
    np.random.seed(42)
    rows = []

    class_dirs = sorted([p for p in CROPS_DIR.iterdir() if p.is_dir()])
    for class_dir in class_dirs:
        crop = class_dir.name.strip().lower()
        imgs = list(_iter_images(class_dir))
        if not imgs:
            continue
        random.shuffle(imgs)
        # Keep generation fast; enough rows for good regressor learning.
        max_per_class = min(int(cfg.get("max_per_class", 180)), len(imgs))
        use_image_stats = bool(cfg.get("use_image_stats", False))
        for img_path in imgs[:max_per_class]:
            stats = _estimate_image_stats(img_path) if use_image_stats else None
            if stats is None:
                brightness = float(np.random.uniform(0.35, 0.85))
                saturation = float(np.random.uniform(0.10, 0.75))
            else:
                brightness, saturation = stats
            area_ratio = float(np.random.uniform(0.45, 0.98))
            freshness_score = float(np.clip(np.random.beta(4.0, 1.8), 0.05, 0.99))

            base = _base_shelf_life(crop)
            shelf = (
                base
                * (0.20 + 0.90 * freshness_score)
                * (0.90 + 0.20 * brightness)
                * (0.92 + 0.16 * saturation)
                * (0.95 + 0.10 * area_ratio)
            )
            shelf += float(np.random.normal(0.0, 0.6))
            shelf = int(max(0, round(shelf)))

            rows.append(
                {
                    "crop_type": crop,
                    "freshness_score": freshness_score,
                    "brightness": brightness,
                    "saturation": saturation,
                    "area_ratio": area_ratio,
                    "shelf_life_days": shelf,
                }
            )

    if len(rows) < 100:
        raise ValueError(
            "Could not generate enough shelf-life rows. Please provide a real shelf_life_training.csv."
        )

    GENERATED_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    gen_df = pd.DataFrame(rows)
    gen_df.to_csv(GENERATED_DATASET_PATH, index=False)
    print(f"Generated fallback shelf-life dataset: {GENERATED_DATASET_PATH} ({len(gen_df)} rows)")
    return GENERATED_DATASET_PATH


def main():
    args = parse_args()
    cfg = PROFILES[args.profile]

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    dataset_path = _find_dataset(args.dataset)
    if dataset_path is None:
        dataset_path = _build_generated_dataset(cfg)
    print(f"Using shelf-life dataset: {dataset_path}")

    # Load dataset
    df = pd.read_csv(dataset_path)
    required = set(FEATURES + [TARGET_COL])
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Missing required columns in shelf-life CSV: {missing}")

    df = df.dropna(subset=FEATURES + [TARGET_COL]).copy()
    if df.empty:
        raise ValueError("No valid rows remain after dropping missing shelf-life rows.")

    X = df[FEATURES]
    y = df[TARGET_COL].clip(lower=0)

    # Stratify by crop type for more stable validation.
    stratify_col = X["crop_type"] if X["crop_type"].nunique() > 1 else None
    X_train, X_val, y_train, y_val = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        shuffle=True,
        stratify=stratify_col,
    )

    # Preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ("crop", make_onehot_encoder(), ["crop_type"]),
            ("num", StandardScaler(), ["freshness_score", "brightness", "saturation", "area_ratio"]),
        ],
        n_jobs=-1,
    )

    model = make_regressor(cfg)

    pipeline = Pipeline(
        steps=[
            ("prep", preprocessor),
            ("model", model),
        ]
    )

    # Train model
    pipeline.fit(X_train, y_train)

    # Validation
    preds = pipeline.predict(X_val)

    mae = float(mean_absolute_error(y_val, preds))
    rmse = float(np.sqrt(mean_squared_error(y_val, preds)))
    r2 = float(r2_score(y_val, preds))

    # Save model
    joblib.dump({"model": pipeline}, MODEL_PATH)

    with META_PATH.open("w") as f:
        json.dump(
            {
                "features": FEATURES,
                "target": TARGET_COL,
                "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
                "profile": args.profile,
                "dataset_path": str(dataset_path),
                "algorithm": "xgboost" if XGBRegressor is not None else "hist_gradient_boosting",
            },
            f,
            indent=2,
        )

    print("Shelf life model saved")
    print("MAE:", mae)
    print("RMSE:", rmse)
    print("R2:", r2)


if __name__ == "__main__":
    main()
