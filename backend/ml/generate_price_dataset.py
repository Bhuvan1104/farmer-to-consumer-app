import pandas as pd
import numpy as np

rows = 1000

data = []

for i in range(rows):

    freshness = np.round(np.random.uniform(0.2, 1.0), 2)

    demand = np.random.randint(1, 10)

    season = np.random.randint(0, 2)

    base_price = 20

    price = (
        base_price
        + freshness * 30
        + demand * 2
        + season * 5
        + np.random.normal(0, 2)
    )

    data.append([
        freshness,
        demand,
        season,
        round(price,2)
    ])

df = pd.DataFrame(
    data,
    columns=[
        "freshness_score",
        "demand_index",
        "season",
        "price"
    ]
)

df.to_csv("price_dataset.csv", index=False)

print("Dataset generated successfully")
print(df.head())