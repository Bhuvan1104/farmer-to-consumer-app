from pathlib import Path
import json
import csv

BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "pricing" / "models"
RUNS_DIR = BASE_DIR / "ml" / "hybrid" / "runs"


def load_latest_yolo_metrics():
    result_files = sorted(RUNS_DIR.glob("*/results.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not result_files:
        return {"note": "No YOLO results.csv found yet. Train detector first."}

    latest = result_files[0]
    with latest.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        return {"note": f"YOLO results file is empty: {latest}"}

    row = rows[-1]
    metrics = {
        "run_results_file": str(latest),
        "epochs_recorded": len(rows),
        "precision_b": row.get("metrics/precision(B)"),
        "recall_b": row.get("metrics/recall(B)"),
        "map50_b": row.get("metrics/mAP50(B)"),
        "map50_95_b": row.get("metrics/mAP50-95(B)"),
    }
    return metrics


def main():
    report = {
        "freshness": {},
        "shelf_life": {},
        "detection": {},
    }

    freshness_eval_path = MODELS_DIR / "freshness_eval_report.json"
    if freshness_eval_path.exists():
        with freshness_eval_path.open("r", encoding="utf-8") as f:
            freshness = json.load(f)
        report["freshness"] = freshness

    shelf_meta_path = MODELS_DIR / "shelf_life_regressor_meta.json"
    if shelf_meta_path.exists():
        with shelf_meta_path.open("r", encoding="utf-8") as f:
            shelf = json.load(f)
        report["shelf_life"] = shelf.get("metrics", {})

    report["detection"] = load_latest_yolo_metrics()

    out_path = BASE_DIR / "ml" / "hybrid" / "hybrid_eval_summary.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=True)

    print(f"Saved hybrid evaluation summary: {out_path}")


if __name__ == "__main__":
    main()
