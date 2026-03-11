import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model

IMG_SIZE = 224

datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2
)

train_generator = datagen.flow_from_directory(
    "../dataset/crops",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=32,
    subset="training"
)

val_generator = datagen.flow_from_directory(
    "../dataset/crops",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=32,
    subset="validation"
)

base_model = MobileNetV2(weights="imagenet", include_top=False)

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation="relu")(x)

output = Dense(train_generator.num_classes, activation="softmax")(x)

model = Model(base_model.input, output)

for layer in base_model.layers:
    layer.trainable = False

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.fit(train_generator, validation_data=val_generator, epochs=10)

model.save("../pricing/models/crop_model.h5")