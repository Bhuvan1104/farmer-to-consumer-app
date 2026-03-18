import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import load_model
import os

print("Evaluating models...")

try:
    # 1. Evaluate Crop Model
    print("\n--- Evaluating Crop Model ---")
    CROP_IMG_SIZE = 224
    crop_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    crop_val_generator = crop_datagen.flow_from_directory(
        "../dataset/crops",
        target_size=(CROP_IMG_SIZE, CROP_IMG_SIZE),
        batch_size=32,
        subset="validation"
    )
    
    crop_model = load_model("../pricing/models/crop_model.h5")
    crop_loss, crop_acc = crop_model.evaluate(crop_val_generator, verbose=0)
    print(f"Crop Model Accuracy: {crop_acc * 100:.2f}%")
except Exception as e:
    print(f"Failed to evaluate crop model: {e}")

try:
    # 2. Evaluate Freshness Model
    print("\n--- Evaluating Freshness Model ---")
    FRESH_IMG_SIZE = 160
    fresh_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    fresh_val_generator = fresh_datagen.flow_from_directory(
        "../dataset/freshness",
        target_size=(FRESH_IMG_SIZE, FRESH_IMG_SIZE),
        batch_size=32,
        class_mode="categorical",
        subset="validation"
    )
    
    fresh_model = load_model("../pricing/models/freshness_model.h5")
    fresh_loss, fresh_acc = fresh_model.evaluate(fresh_val_generator, verbose=0)
    print(f"Freshness Model Accuracy: {fresh_acc * 100:.2f}%")
except Exception as e:
    print(f"Failed to evaluate freshness model: {e}")
