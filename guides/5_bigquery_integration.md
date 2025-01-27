# Dagster Integration Guide: Working with BigQuery

## Overview

Dagster is a modern data orchestration framework that introduces key abstractions like Software-Defined Assets (SDAs), Ops, and Jobs to manage data pipelines. This guide covers integrating Dagster with BigQuery, focusing on best practices and common patterns.

## Core Concepts

### Software-Defined Assets (SDAs)
SDAs represent data objects (tables, files, ML models) as nodes in your data pipeline. They're the fundamental building blocks in Dagster's asset-based orchestration paradigm.

### Ops and Jobs
- **Ops**: Individual operations that perform specific tasks
- **Jobs**: Collections of ops that are executed together
- **Assets**: Can be composed into both ops and jobs

## Setting Up Dagster with BigQuery

### 1. Installation and Dependencies

```python
# Required packages
pip install dagster dagster-cloud dagster-gcp google-cloud-bigquery
```

### 2. BigQuery Connection Configuration

```python
from dagster import Definitions, EnvVar
from dagster_gcp import BigQueryResource

defs = Definitions(
    resources={
        "bigquery": BigQueryResource(
            project=EnvVar("GCP_PROJECT_ID"),
            location="US"  # or your preferred location
        )
    }
)
```

## Asset-Based Pattern Examples

### 1. Basic Table Asset

```python
from dagster import asset
from dagster_gcp import BigQueryResource

@asset
def raw_sales_data(bigquery: BigQueryResource):
    """Raw sales data from source system."""
    query = """
    SELECT * FROM `project.dataset.raw_sales`
    WHERE date = CURRENT_DATE()
    """
    return bigquery.query(query)

@asset
def daily_sales_summary(bigquery: BigQueryResource, raw_sales_data):
    """Aggregated daily sales summary."""
    summary_query = f"""
    SELECT 
        date,
        SUM(amount) as total_sales,
        COUNT(DISTINCT customer_id) as unique_customers
    FROM raw_sales_data
    GROUP BY date
    """
    return bigquery.query(summary_query)
```

### 2. Partitioned Assets

```python
from dagster import asset, DailyPartitionsDefinition
from datetime import datetime, timedelta

partitions_def = DailyPartitionsDefinition(
    start_date="2024-01-01",
    end_date=datetime.now().strftime("%Y-%m-%d")
)

@asset(partitions_def=partitions_def)
def daily_sales_partition(context, bigquery: BigQueryResource):
    """Partitioned sales data by date."""
    partition_date = context.partition_key
    
    query = f"""
    SELECT *
    FROM `project.dataset.sales`
    WHERE DATE(transaction_date) = '{partition_date}'
    """
    return bigquery.query(query)
```

### 3. Multi-Asset Pattern

```python
from dagster import multi_asset, AssetOut, Output

@multi_asset(
    outs={
        "customer_metrics": AssetOut(),
        "product_metrics": AssetOut(),
    }
)
def calculate_metrics(bigquery: BigQueryResource):
    """Generate multiple related metrics tables."""
    
    # Customer metrics
    customer_query = """
    SELECT 
        customer_id,
        COUNT(*) as total_orders,
        SUM(amount) as lifetime_value
    FROM `project.dataset.orders`
    GROUP BY customer_id
    """
    customer_results = bigquery.query(customer_query)
    
    # Product metrics
    product_query = """
    SELECT 
        product_id,
        COUNT(*) as times_sold,
        AVG(price) as avg_price
    FROM `project.dataset.orders`
    GROUP BY product_id
    """
    product_results = bigquery.query(product_query)
    
    return {
        "customer_metrics": Output(customer_results),
        "product_metrics": Output(product_results)
    }
```

## Common Design Patterns

### 1. ETL Pattern

```python
@asset
def extract_data(bigquery: BigQueryResource):
    """Extract raw data from source."""
    return bigquery.query("SELECT * FROM source_table")

@asset
def transform_data(extract_data):
    """Transform raw data."""
    df = extract_data.copy()
    # Apply transformations
    return df

@asset
def load_data(bigquery: BigQueryResource, transform_data):
    """Load transformed data to target."""
    bigquery.load_table_from_dataframe(
        transform_data,
        destination="project.dataset.target_table"
    )
```

### 2. Dependency Chain Pattern

```python
@asset
def source_data(bigquery: BigQueryResource):
    return bigquery.query("SELECT * FROM source")

@asset
def intermediate_data(source_data):
    # Process source data
    return processed_data

@asset
def final_data(intermediate_data):
    # Final transformations
    return final_result
```

### 3. Fan-Out Pattern

```python
@asset
def source_table(bigquery: BigQueryResource):
    return bigquery.query("SELECT * FROM main_table")

@asset
def analytics_table(source_table):
    # Transform for analytics
    return analytics_data

@asset
def reporting_table(source_table):
    # Transform for reporting
    return reporting_data

@asset
def ml_features(source_table):
    # Transform for ML
    return feature_data
```

## Best Practices

1. **Resource Configuration**
   - Use environment variables for sensitive credentials
   - Configure resources at the definition level
   - Use separate resource configs for development and production

2. **Asset Organization**
   - Group related assets in modules
   - Use meaningful names that reflect business concepts
   - Document dependencies clearly

3. **Testing**
   - Use Dagster's test utilities
   - Mock BigQuery responses for unit tests
   - Create integration test assets

4. **Monitoring**
   - Implement proper logging
   - Use Dagster's built-in monitoring
   - Set up alerts for failed assets

## Error Handling

```python
from dagster import asset, DagsterError

@asset
def robust_query(bigquery: BigQueryResource):
    try:
        results = bigquery.query("SELECT * FROM table")
        if results.empty:
            raise DagsterError("Query returned no results")
        return results
    except Exception as e:
        raise DagsterError(f"Query failed: {str(e)}")
```

## Advanced Features

### 1. Asset Observation

```python
from dagster import asset_observation

@asset_observation
def monitor_table_size(context, bigquery: BigQueryResource):
    """Monitor size of important tables."""
    query = """
    SELECT 
        table_id,
        size_bytes/1024/1024/1024 as size_gb
    FROM `project.dataset.__TABLES__`
    """
    results = bigquery.query(query)
    
    for _, row in results.iterrows():
        context.log.info(
            f"Table {row['table_id']} size: {row['size_gb']:.2f} GB"
        )
```

### 2. Asset Checks

```python
from dagster import asset_check

@asset_check
def validate_data_quality(context, bigquery: BigQueryResource):
    """Check data quality metrics."""
    query = """
    SELECT 
        COUNT(*) as row_count,
        COUNT(DISTINCT id) as unique_ids
    FROM `project.dataset.important_table`
    """
    results = bigquery.query(query)
    
    assert results['row_count'][0] > 0, "Table is empty"
    assert results['row_count'][0] == results['unique_ids'][0], "Duplicate IDs found"
```

## Deployment Considerations

1. **Infrastructure**
   - Use Dagster Cloud or self-hosted
   - Configure proper IAM roles
   - Set up monitoring and alerting

2. **Scaling**
   - Use partitioned assets for large datasets
   - Implement proper resource limits
   - Monitor query costs

3. **Security**
   - Use service accounts
   - Implement proper access controls
   - Audit query patterns

Remember to adjust these patterns based on your specific use case and requirements. The examples provided are templates that should be modified to match your data model and business logic.