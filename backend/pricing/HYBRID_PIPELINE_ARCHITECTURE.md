# Hybrid CV Upgrade (Integrated with Existing Project)

This upgrade keeps the existing Django pricing API and adds a multi-stage CV pipeline:

1. Image upload
2. YOLOv8 crop detection (`yolo_crop_detector.pt`)
3. Freshness classification with transfer learning (`freshness_tl_model.h5`)
4. Shelf-life regression (`shelf_life_regressor.joblib`)
5. Structured API response

## Runtime Integration

- Existing endpoint: `POST /api/pricing/predict-freshness/`
- New runtime module: `backend/pricing/services/hybrid/hybrid_pipeline.py`
- Existing view uses hybrid pipeline when hybrid model artifacts exist.
- If artifacts are missing, it falls back to legacy model flow.

## Structured Output

```json
{
  "crop_type": "tomato",
  "freshness_score": 0.87,
  "freshness_category": "Fresh",
  "estimated_shelf_life_days": 5
}
```

## Training Scripts

- YOLOv8 detector: `backend/ml/hybrid/train_yolo_detector.py`
- Freshness TL model: `backend/ml/hybrid/train_freshness_classifier_tl.py`
- Shelf-life regressor: `backend/ml/hybrid/train_shelf_life_regressor.py`
- Evaluation summary: `backend/ml/hybrid/evaluate_hybrid_pipeline.py`

## Dataset Quality Improvements (High Impact)

1. Remove noisy labels and near-duplicate images.
2. Balance class counts (especially minority crops).
3. Ensure each crop has varied backgrounds and lighting.
4. Keep train/val split by source (avoid leakage from augmented copies).
5. For freshness classes, keep clear criteria and review label consistency.
6. For shelf-life regression, include real labels from storage logs (temperature/humidity-aware if possible).

## Steps to Push Accuracy > 90%

1. Use strong pretrained backbones only (YOLOv8 + EfficientNet/ResNet).
2. Increase data quality before increasing model size.
3. Use class weighting/focal loss for imbalanced classes.
4. Tune confidence thresholds using validation curves, not fixed guesses.
5. Add hard-negative mining for non-produce images in detector training.
6. Track per-class metrics and fix worst classes first.
7. Add test-time augmentation for difficult freshness samples.
8. Periodically retrain and evaluate with confusion matrix and error buckets.

## Expected Artifacts in `backend/pricing/models`

- `yolo_crop_detector.pt`
- `freshness_tl_model.h5`
- `freshness_labels.json`
- `shelf_life_regressor.joblib`
- `shelf_life_regressor_meta.json`
- `crop_classes.json` (from crop model training script)

## Notes

- The hybrid pipeline is integrated, not a full rewrite.
- Existing pricing workflows continue to work with fallback behavior.

## Faster Training Profiles

Use profile flags to trade speed vs quality without changing code:

- Crop model:
  - `python backend/ml/train_crop_model.py --profile fast`
  - `python backend/ml/train_crop_model.py --profile balanced`
  - `python backend/ml/train_crop_model.py --profile quality`

- Freshness TL model:
  - `python backend/ml/hybrid/train_freshness_classifier_tl.py --profile fast`
  - `python backend/ml/hybrid/train_freshness_classifier_tl.py --profile balanced`
  - `python backend/ml/hybrid/train_freshness_classifier_tl.py --profile quality`

- YOLO detector:
  - `python backend/ml/hybrid/train_yolo_detector.py --profile fast`
  - `python backend/ml/hybrid/train_yolo_detector.py --profile balanced`
  - `python backend/ml/hybrid/train_yolo_detector.py --profile quality`

Recommended starting point: `balanced`.
For quick iteration: `fast` first, then `balanced` for final model export.
