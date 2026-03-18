import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras import mixed_precision
from tensorflow.keras.applications import MobileNetV3Small
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator


BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_DIR = BASE_DIR / "dataset" / "crops"
MODELS_DIR = BASE_DIR / "pricing" / "models"
MODEL_PATH = MODELS_DIR / "crop_model.h5"
CLASS_MAP_PATH = MODELS_DIR / "crop_classes.json"
META_PATH = MODELS_DIR / "crop_model_meta.json"

PROFILES = {
    "fast": {"img_size": 192, "batch": 20, "head_epochs": 3, "fine_epochs": 2, "fraction": 0.55},
    "balanced": {"img_size": 224, "batch": 28, "head_epochs": 5, "fine_epochs": 3, "fraction": 0.80},
    "quality": {"img_size": 256, "batch": 24, "head_epochs": 8, "fine_epochs": 5, "fraction": 1.00},
}

VALIDATION_SPLIT = 0.2
SEED = 42


def parse_args():
    parser = argparse.ArgumentParser(description="Train crop classification model")
    parser.add_argument("--profile", choices=PROFILES.keys(), default="balanced")
    parser.add_argument(
        "--fraction",
        type=float,
        default=None,
        help="Optional training data fraction override in (0,1].",
    )
    return parser.parse_args()


def build_generators(img_size, batch_size):
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        validation_split=VALIDATION_SPLIT,
        rotation_range=20,
        width_shift_range=0.12,
        height_shift_range=0.12,
        zoom_range=0.15,
        horizontal_flip=True,
        brightness_range=[0.8, 1.2],
        fill_mode="nearest",
    )

    eval_datagen = ImageDataGenerator(rescale=1.0 / 255.0, validation_split=VALIDATION_SPLIT)

    train_generator = train_datagen.flow_from_directory(
        str(DATASET_DIR),
        target_size=(img_size, img_size),
        batch_size=batch_size,
        subset="training",
        class_mode="categorical",
        shuffle=True,
        seed=SEED,
    )

    val_generator = eval_datagen.flow_from_directory(
        str(DATASET_DIR),
        target_size=(img_size, img_size),
        batch_size=batch_size,
        subset="validation",
        class_mode="categorical",
        shuffle=False,
        seed=SEED,
    )

    return train_generator, val_generator


def build_model(num_classes, img_size):
    base_model = MobileNetV3Small(weights="imagenet", include_top=False, input_shape=(img_size, img_size, 3))

    for layer in base_model.layers:
        layer.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(256, activation="relu")(x)
    output = Dense(num_classes, activation="softmax")(x)

    model = Model(base_model.input, output)
    return model, base_model


def compile_model(model, lr):
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )


def maybe_enable_mixed_precision():
    try:
        if tf.config.list_physical_devices("GPU"):
            mixed_precision.set_global_policy("mixed_float16")
            print("Mixed precision enabled (GPU)")
    except Exception:
        pass


def class_weights(train_generator):
    y = train_generator.classes
    cls = np.unique(y)
    w = compute_class_weight(class_weight="balanced", classes=cls, y=y)
    return {int(c): float(v) for c, v in zip(cls, w)}


def save_class_metadata(class_indices, img_size, batch_size, profile):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    with CLASS_MAP_PATH.open("w", encoding="utf-8") as f:
        json.dump(class_indices, f, indent=2, ensure_ascii=True)

    with META_PATH.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "img_size": img_size,
                "batch_size": batch_size,
                "validation_split": VALIDATION_SPLIT,
                "seed": SEED,
                "profile": profile,
            },
            f,
            indent=2,
            ensure_ascii=True,
        )


def main():
    args = parse_args()
    cfg = PROFILES[args.profile]
    train_fraction = float(cfg["fraction"] if args.fraction is None else args.fraction)
    train_fraction = max(0.1, min(1.0, train_fraction))

    if not DATASET_DIR.exists():
        raise FileNotFoundError(f"Dataset directory not found: {DATASET_DIR}")

    maybe_enable_mixed_precision()
    train_generator, val_generator = build_generators(cfg["img_size"], cfg["batch"])
    model, base_model = build_model(train_generator.num_classes, cfg["img_size"])

    cbs = [
        EarlyStopping(
            monitor="val_accuracy",
            patience=2,
            min_delta=0.002,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=1, min_lr=1e-6, verbose=1),
    ]
    # Keras 3 + DirectoryIterator can become unstable with manual steps_per_epoch.
    # Keep iterators full-length and speed up with fewer epochs instead.
    head_epochs = max(1, int(round(cfg["head_epochs"] * train_fraction)))
    fine_epochs = max(1, int(round(cfg["fine_epochs"] * train_fraction)))

    # Stage 1: train classifier head quickly.
    compile_model(model, lr=1e-3)
    model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=head_epochs,
        callbacks=cbs,
        class_weight=class_weights(train_generator),
        verbose=1,
    )

    # Stage 2: fine-tune last MobileNetV3 blocks for extra accuracy.
    for layer in base_model.layers[-30:]:
        layer.trainable = True
    compile_model(model, lr=2e-4)
    model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=fine_epochs,
        callbacks=cbs,
        class_weight=class_weights(train_generator),
        verbose=1,
    )

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model.save(str(MODEL_PATH))
    save_class_metadata(train_generator.class_indices, cfg["img_size"], cfg["batch"], args.profile)

    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved class map to: {CLASS_MAP_PATH}")
    print(f"Saved metadata to: {META_PATH}")


if __name__ == "__main__":
    main()
