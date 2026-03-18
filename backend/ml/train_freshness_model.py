import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras import callbacks, mixed_precision
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator


BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_DIR = BASE_DIR / "dataset" / "freshness"
MODEL_PATH = BASE_DIR / "pricing" / "models" / "freshness_model.h5"

PROFILES = {
    "fast": {"img_size": 160, "batch": 28, "head_epochs": 3, "fine_epochs": 2, "fraction": 0.60},
    "balanced": {"img_size": 192, "batch": 32, "head_epochs": 4, "fine_epochs": 3, "fraction": 0.85},
    "quality": {"img_size": 224, "batch": 28, "head_epochs": 8, "fine_epochs": 5, "fraction": 1.00},
}

VALIDATION_SPLIT = 0.2
SEED = 42


def parse_args():
    parser = argparse.ArgumentParser(description="Train legacy freshness classification model")
    parser.add_argument("--profile", choices=PROFILES.keys(), default="balanced")
    parser.add_argument(
        "--fraction",
        type=float,
        default=None,
        help="Optional training data fraction override in (0,1].",
    )
    return parser.parse_args()


def maybe_enable_mixed_precision():
    try:
        if tf.config.list_physical_devices("GPU"):
            mixed_precision.set_global_policy("mixed_float16")
            print("Mixed precision enabled (GPU)")
    except Exception:
        pass


def build_generators(img_size, batch_size):
    if not DATASET_DIR.exists():
        raise FileNotFoundError(f"Freshness dataset not found: {DATASET_DIR}")

    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        validation_split=VALIDATION_SPLIT,
        rotation_range=15,
        zoom_range=0.15,
        horizontal_flip=True,
        brightness_range=[0.85, 1.15],
    )
    eval_datagen = ImageDataGenerator(rescale=1.0 / 255.0, validation_split=VALIDATION_SPLIT)

    train_generator = train_datagen.flow_from_directory(
        str(DATASET_DIR),
        target_size=(img_size, img_size),
        batch_size=batch_size,
        class_mode="categorical",
        subset="training",
        shuffle=True,
        seed=SEED,
    )
    val_generator = eval_datagen.flow_from_directory(
        str(DATASET_DIR),
        target_size=(img_size, img_size),
        batch_size=batch_size,
        class_mode="categorical",
        subset="validation",
        shuffle=False,
        seed=SEED,
    )
    return train_generator, val_generator


def build_model(num_classes, img_size):
    base = EfficientNetB0(weights="imagenet", include_top=False, input_shape=(img_size, img_size, 3))
    for layer in base.layers:
        layer.trainable = False

    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.25)(x)
    x = Dense(192, activation="relu")(x)
    out = Dense(num_classes, activation="softmax", dtype="float32")(x)
    return Model(base.input, out), base


def compile_model(model, lr):
    model.compile(optimizer=Adam(learning_rate=lr), loss="categorical_crossentropy", metrics=["accuracy"])


def build_class_weights(train_gen):
    y = train_gen.classes
    classes = np.unique(y)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y)
    return {int(c): float(w) for c, w in zip(classes, weights)}


def main():
    args = parse_args()
    cfg = PROFILES[args.profile]
    train_fraction = float(cfg["fraction"] if args.fraction is None else args.fraction)
    train_fraction = max(0.1, min(1.0, train_fraction))

    maybe_enable_mixed_precision()
    train_gen, val_gen = build_generators(cfg["img_size"], cfg["batch"])
    model, base = build_model(train_gen.num_classes, cfg["img_size"])

    callbacks_list = [
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=2,
            min_delta=0.002,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=1, min_lr=1e-6, verbose=1),
    ]
    head_epochs = max(1, int(round(cfg["head_epochs"] * train_fraction)))
    fine_epochs = max(1, int(round(cfg["fine_epochs"] * train_fraction)))

    compile_model(model, 1e-3)
    model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=head_epochs,
        class_weight=build_class_weights(train_gen),
        callbacks=callbacks_list,
        verbose=1,
    )

    for layer in base.layers[-25:]:
        layer.trainable = True
    compile_model(model, 2e-4)
    model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=fine_epochs,
        class_weight=build_class_weights(train_gen),
        callbacks=callbacks_list,
        verbose=1,
    )

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(MODEL_PATH))
    print(f"Saved freshness model: {MODEL_PATH}")


if __name__ == "__main__":
    main()
