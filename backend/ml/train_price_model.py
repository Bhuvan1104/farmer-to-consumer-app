import pandas as pd
from xgboost import XGBRegressor
import pickle

data = pd.read_csv("price_dataset.csv")

X = data[["freshness_score","demand_index","season"]]
y = data["price"]

model = XGBRegressor()

model.fit(X,y)

pickle.dump(model,open("../pricing/models/price_model.pkl","wb"))