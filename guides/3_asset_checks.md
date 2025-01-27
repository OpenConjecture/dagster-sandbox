# Dagster Asset Checks: A Comprehensive Guide

## Overview

Asset checks in Dagster are a powerful feature that allows you to validate the quality and integrity of your data assets. They run independently of asset computations and can be scheduled separately, making them ideal for monitoring data quality over time.

## Key Concepts

### Asset Checks vs. Asset Computations

- Asset checks **validate** data assets but don't modify them
- Checks can run on a different schedule than the asset computation
- Multiple checks can be defined for a single asset
- Checks return a status indicating success, failure, or warning

### Types of Asset Checks

1. **Data Quality Checks**
   - Validate data completeness
   - Check for null values
   - Verify data ranges
   - Ensure data freshness

2. **Data Integrity Checks**
   - Verify relationships between assets
   - Check for duplicates
   - Validate data schema
   - Ensure referential integrity

3. **Business Logic Checks**
   - Validate business rules
   - Check aggregation results
   - Verify calculations
   - Monitor trends and anomalies

## Implementation Guide

### Basic Asset Check Structure

```python
from dagster import asset_check, AssetCheckResult, AssetKey

@asset_check(asset_key=AssetKey("my_table"))
def check_my_table_completeness():
    # Perform check logic
    row_count = get_row_count()
    if row_count < 1000:
        return AssetCheckResult(
            success=False,
            message=f"Table has insufficient data: {row_count} rows"
        )
    return AssetCheckResult(success=True)
```

### Advanced Check Patterns

#### 1. Multi-Asset Checks

```python
@asset_check(asset_keys=[AssetKey("table_a"), AssetKey("table_b")])
def check_referential_integrity():
    # Check relationships between multiple assets
    mismatches = find_foreign_key_mismatches()
    return AssetCheckResult(
        success=len(mismatches) == 0,
        metadata={
            "mismatched_keys": mismatches,
            "total_records": len(get_all_records())
        }
    )
```

#### 2. Parameterized Checks

```python
@asset_check(
    asset_key=AssetKey("sales_data"),
    parameters={
        "min_value": Int.param_hash(default=0),
        "max_value": Int.param_hash(default=1000000)
    }
)
def check_sales_range(context, min_value, max_value):
    df = context.asset.get_data()
    outliers = df[~df["amount"].between(min_value, max_value)]
    
    return AssetCheckResult(
        success=len(outliers) == 0,
        metadata={
            "outliers_count": len(outliers),
            "min_found": df["amount"].min(),
            "max_found": df["amount"].max()
        }
    )
```

#### 3. Time-Based Checks

```python
from datetime import datetime, timedelta

@asset_check(asset_key=AssetKey("daily_metrics"))
def check_data_freshness():
    latest_timestamp = get_latest_timestamp()
    threshold = datetime.now() - timedelta(hours=24)
    
    return AssetCheckResult(
        success=latest_timestamp > threshold,
        metadata={"latest_timestamp": latest_timestamp.isoformat()}
    )
```

## Best Practices

### 1. Check Design

- Keep checks focused and single-purpose
- Use meaningful names that describe the check's purpose
- Include relevant metadata in check results
- Set appropriate severity levels for different types of failures

### 2. Error Handling

```python
@asset_check(asset_key=AssetKey("customer_data"))
def check_with_error_handling():
    try:
        # Perform check logic
        result = validate_customer_data()
        return AssetCheckResult(
            success=result.is_valid,
            metadata=result.metadata
        )
    except Exception as e:
        return AssetCheckResult(
            success=False,
            message=f"Check failed to execute: {str(e)}",
            metadata={"error_type": type(e).__name__}
        )
```

### 3. Performance Considerations

- Use sampling for large datasets
- Implement timeouts for long-running checks
- Cache intermediate results when possible
- Use efficient query patterns

```python
@asset_check(asset_key=AssetKey("large_table"))
def check_with_sampling():
    # Sample 1% of records for performance
    sample_size = 0.01
    
    df = get_sampled_data(sample_size)
    null_count = df.isnull().sum()
    
    return AssetCheckResult(
        success=(null_count / len(df) < 0.05),
        metadata={
            "sample_size": f"{sample_size * 100}%",
            "null_percentage": f"{(null_count / len(df)) * 100}%"
        }
    )
```

### 4. Testing Asset Checks

```python
def test_sales_range_check():
    # Create test data
    test_df = pd.DataFrame({
        "amount": [100, 200, 1500000]  # Include outlier
    })
    
    # Mock context
    context = build_test_context(test_df)
    
    # Run check
    result = check_sales_range(
        context,
        min_value=0,
        max_value=1000000
    )
    
    assert not result.success
    assert result.metadata["outliers_count"] == 1
```

## Common Patterns and Examples

### 1. Schema Validation

```python
from pydantic import BaseModel, ValidationError

class ExpectedSchema(BaseModel):
    id: int
    name: str
    value: float

@asset_check(asset_key=AssetKey("data_asset"))
def check_schema_compliance():
    records = get_records()
    validation_errors = []
    
    for record in records:
        try:
            ExpectedSchema(**record)
        except ValidationError as e:
            validation_errors.append(str(e))
    
    return AssetCheckResult(
        success=len(validation_errors) == 0,
        metadata={"validation_errors": validation_errors}
    )
```

### 2. Statistical Checks

```python
@asset_check(asset_key=AssetKey("metric_data"))
def check_statistical_anomalies():
    df = get_metric_data()
    
    # Calculate z-scores
    mean = df["value"].mean()
    std = df["value"].std()
    z_scores = (df["value"] - mean) / std
    
    # Flag anomalies (z-score > 3)
    anomalies = df[abs(z_scores) > 3]
    
    return AssetCheckResult(
        success=len(anomalies) < 10,  # Allow some anomalies
        metadata={
            "anomaly_count": len(anomalies),
            "mean": mean,
            "std": std
        }
    )
```

### 3. Cross-Asset Validation

```python
@asset_check(
    asset_keys=[
        AssetKey("orders"),
        AssetKey("customers"),
        AssetKey("products")
    ]
)
def check_data_consistency():
    # Check order references are valid
    invalid_customers = find_invalid_customer_references()
    invalid_products = find_invalid_product_references()
    
    return AssetCheckResult(
        success=len(invalid_customers) == 0 and len(invalid_products) == 0,
        metadata={
            "invalid_customer_refs": invalid_customers,
            "invalid_product_refs": invalid_products
        }
    )
```

## Monitoring and Alerting

### Setting Up Notifications

```python
from dagster import RunRequest, sensor

@sensor(asset_checks=[check_my_table_completeness])
def notify_on_check_failure(context):
    for check_key in context.latest_check_results:
        result = context.latest_check_results[check_key]
        if not result.success:
            # Trigger notification
            send_alert(
                check_name=check_key.name,
                message=result.message,
                metadata=result.metadata
            )
```

## Conclusion

Asset checks are a crucial part of maintaining data quality in your Dagster pipelines. By following these patterns and best practices, you can build robust data quality monitoring that helps ensure the reliability of your data platform.

Remember to:
- Design focused, single-purpose checks
- Include comprehensive error handling
- Consider performance implications
- Test your checks thoroughly
- Set up appropriate monitoring and alerting