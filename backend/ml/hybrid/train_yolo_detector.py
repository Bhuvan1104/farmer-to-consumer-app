import argparse
from pathlib import Path
import shutil
import random

from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[2]

YOLO_DATA_YAML = BASE_DIR / "dataset" / "yolo_crop" / "data.yaml"
YOLO_ROOT = BASE_DIR / "dataset" / "yolo_crop"
CLASSIFICATION_DATASET_DIR = BASE_DIR / "dataset" / "crops"

MODELS_DIR = BASE_DIR / "pricing" / "models"

RUNS_DIR = BASE_DIR / "ml" / "hybrid" / "runs"


# Faster training configurations
PROFILES = {
    "fast": {
        "weights": "yolov8n.pt",
        "imgsz": 320,
        "epochs": 8,
        "patience": 3,
        "batch": 16,
        "fraction": 0.35,
    },
    "balanced": {
        "weights": "yolov8n.pt",
        "imgsz": 384,
        "epochs": 14,
        "patience": 4,
        "batch": 16,
        "fraction": 0.60,
    },
    "quality": {
        "weights": "yolov8n.pt",
        "imgsz": 448,
        "epochs": 24,
        "patience": 6,
        "batch": 16,
        "fraction": 1.00,
    },
}


def parse_args():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--profile",
        choices=PROFILES.keys(),
        default="balanced"
    )

    parser.add_argument(
        "--name",
        default="yolo_crop"
    )
    parser.add_argument(
        "--fraction",
        type=float,
        default=None,
        help="Optional training data fraction override in (0,1].",
    )

    return parser.parse_args()


def _iter_images(path: Path):
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    for p in path.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            yield p


def _build_minimal_yolo_dataset() -> None:
    if not CLASSIFICATION_DATASET_DIR.exists():
        raise FileNotFoundError(
            f"YOLO data.yaml missing and classification dataset not found: {CLASSIFICATION_DATASET_DIR}"
        )

    class_dirs = sorted([p for p in CLASSIFICATION_DATASET_DIR.iterdir() if p.is_dir()])
    if not class_dirs:
        raise ValueError(f"No class folders found in {CLASSIFICATION_DATASET_DIR}")

    # Build a detection dataset using full-image boxes as a bootstrap.
    for split in ("train", "val"):
        (YOLO_ROOT / "images" / split).mkdir(parents=True, exist_ok=True)
        (YOLO_ROOT / "labels" / split).mkdir(parents=True, exist_ok=True)

    for class_id, class_dir in enumerate(class_dirs):
        images = list(_iter_images(class_dir))
        if not images:
            continue
        random.shuffle(images)
        val_count = max(1, int(0.2 * len(images)))
        val_set = set(images[:val_count])

        for img in images:
            split = "val" if img in val_set else "train"
            stem = f"{class_dir.name}_{img.stem}"
            dst_img = YOLO_ROOT / "images" / split / f"{stem}{img.suffix.lower()}"
            dst_lbl = YOLO_ROOT / "labels" / split / f"{stem}.txt"
            shutil.copy2(img, dst_img)
            # Full image bounding box: class cx cy w h
            dst_lbl.write_text(f"{class_id} 0.5 0.5 1.0 1.0\n", encoding="utf-8")

    names = [p.name for p in class_dirs]
    yaml_text = (
        f"path: {YOLO_ROOT.as_posix()}\n"
        "train: images/train\n"
        "val: images/val\n"
        f"nc: {len(names)}\n"
        f"names: {names}\n"
    )
    YOLO_DATA_YAML.write_text(yaml_text, encoding="utf-8")


def ensure_yolo_dataset_ready():
    if YOLO_DATA_YAML.exists():
        return
    print(f"YOLO data.yaml not found at {YOLO_DATA_YAML}, creating a bootstrap dataset...")
    _build_minimal_yolo_dataset()
    print(f"Created YOLO dataset at {YOLO_ROOT}")


def main():

    args = parse_args()

    cfg = PROFILES[args.profile]
    train_fraction = float(cfg["fraction"] if args.fraction is None else args.fraction)
    train_fraction = max(0.1, min(1.0, train_fraction))

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    ensure_yolo_dataset_ready()

    model = YOLO(cfg["weights"])

    results = model.train(
        data=str(YOLO_DATA_YAML),
        imgsz=cfg["imgsz"],
        epochs=cfg["epochs"],
        batch=cfg["batch"],
        patience=cfg["patience"],

        # Faster optimizer settings
        optimizer="AdamW",
        lr0=5e-4,
        lrf=0.01,

        # Reduce warmup
        warmup_epochs=1,

        # Faster augmentation
        hsv_h=0.01,
        hsv_s=0.5,
        hsv_v=0.3,
        fliplr=0.5,
        scale=0.1,
        degrees=5,
        translate=0.03,

        # Freeze backbone for faster early training
        freeze=8,

        # Performance settings
        cache=False,
        amp=True,
        workers=4,
        fraction=train_fraction,

        project=str(RUNS_DIR),
        name=f"{args.name}_{args.profile}",
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"

    target = MODELS_DIR / "yolo_crop_detector.pt"

    shutil.copy2(best_weights, target)

    print("YOLO model saved:", target)


if __name__ == "__main__":
    main()
