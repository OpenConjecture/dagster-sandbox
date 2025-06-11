---
title: Building Your First Pipeline
type: hands-on
estimatedMinutes: 60
---

# Building Your First Dagster Pipeline

Let's build a real pipeline that downloads cryptocurrency prices, processes them, and generates a simple report.

## Setting Up Your Project

First, create a new Dagster project:

```bash
pip install dagster dagit
dagster project scaffold --name crypto_pipeline
cd crypto_pipeline
```

## Step 1: Define Your First Asset

Let's create an asset that fetches Bitcoin price data:

```python
# crypto_pipeline/assets/crypto_prices.py
from dagster import asset
import requests
import pandas as pd
from datetime import datetime, timedelta

@asset
def bitcoin_prices():
    """Fetch Bitcoin price data for the last 7 days"""
    
    # CoinGecko API (free tier)
    url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
    params = {
        "vs_currency": "usd",
        "days": "7",
        "interval": "daily"
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    # Convert to DataFrame
    df = pd.DataFrame(data["prices"], columns=["timestamp", "price"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df["date"] = df["timestamp"].dt.date
    
    return df
```

## Step 2: Add Data Processing

Now let's add an asset that processes this data:

```python
@asset
def bitcoin_price_analysis(bitcoin_prices):
    """Calculate price statistics and trends"""
    
    df = bitcoin_prices.copy()
    
    # Calculate statistics
    stats = {
        "current_price": df["price"].iloc[-1],
        "avg_price": df["price"].mean(),
        "max_price": df["price"].max(),
        "min_price": df["price"].min(),
        "price_change_pct": (
            (df["price"].iloc[-1] - df["price"].iloc[0]) / 
            df["price"].iloc[0] * 100
        )
    }
    
    # Add moving average
    df["ma_3"] = df["price"].rolling(window=3).mean()
    
    return {
        "data": df,
        "stats": stats
    }
```

## Step 3: Create a Report Asset

Let's generate a simple markdown report:

```python
@asset
def bitcoin_report(bitcoin_price_analysis):
    """Generate a markdown report of Bitcoin price analysis"""
    
    data = bitcoin_price_analysis["data"]
    stats = bitcoin_price_analysis["stats"]
    
    report = f"""
# Bitcoin Price Report

Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Summary Statistics

- **Current Price**: ${stats['current_price']:,.2f}
- **7-Day Average**: ${stats['avg_price']:,.2f}
- **7-Day High**: ${stats['max_price']:,.2f}
- **7-Day Low**: ${stats['min_price']:,.2f}
- **7-Day Change**: {stats['price_change_pct']:.2f}%

## Price History

| Date | Price | 3-Day MA |
|------|-------|----------|
"""
    
    for _, row in data.iterrows():
        ma_value = f"${row['ma_3']:,.2f}" if pd.notna(row['ma_3']) else "N/A"
        report += f"| {row['date']} | ${row['price']:,.2f} | {ma_value} |\n"
    
    return report
```

## Step 4: Configure Your Dagster Repository

Update your repository definition:

```python
# crypto_pipeline/__init__.py
from dagster import Definitions, load_assets_from_modules

from . import assets

all_assets = load_assets_from_modules([assets])

defs = Definitions(
    assets=all_assets,
)
```

## Step 5: Run Your Pipeline

Start the Dagit UI:

```bash
dagster dev
```

Navigate to http://localhost:3000 and you'll see your assets in the UI.

### Materialize Your Assets

1. Click on the "Assets" tab
2. Select all three assets
3. Click "Materialize selected"

Watch as Dagster:
- Downloads Bitcoin prices
- Analyzes the data
- Generates a report

## Step 6: Add Error Handling

Let's make our pipeline more robust:

```python
from dagster import asset, AssetExecutionContext
import time

@asset(
    retry_policy=RetryPolicy(max_retries=3, delay=5)
)
def bitcoin_prices_with_retry(context: AssetExecutionContext):
    """Fetch Bitcoin prices with retry logic"""
    
    context.log.info("Fetching Bitcoin price data...")
    
    try:
        # API call with timeout
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        # ... rest of the logic
        
    except requests.RequestException as e:
        context.log.error(f"Failed to fetch data: {e}")
        raise
```

## Step 7: Add a Schedule

Run this pipeline daily:

```python
from dagster import ScheduleDefinition

daily_crypto_schedule = ScheduleDefinition(
    name="daily_crypto_update",
    cron_schedule="0 9 * * *",  # 9 AM daily
    job=define_asset_job(
        "daily_crypto_job",
        selection=["bitcoin_prices", "bitcoin_price_analysis", "bitcoin_report"]
    ),
)

# Add to Definitions
defs = Definitions(
    assets=all_assets,
    schedules=[daily_crypto_schedule],
)
```

## Exercises

1. **Add More Cryptocurrencies**: Extend the pipeline to fetch Ethereum prices
2. **Visualization**: Create an asset that generates a price chart
3. **Alerts**: Add an asset that sends alerts when price changes exceed 10%

## Key Takeaways

- Assets represent the data your pipeline produces
- Assets can depend on other assets, creating a DAG
- Dagit provides powerful visualization and monitoring
- Error handling and scheduling are built-in features

Congratulations! You've built your first Dagster pipeline. In the next module, we'll dive deeper into working with Software-Defined Assets.