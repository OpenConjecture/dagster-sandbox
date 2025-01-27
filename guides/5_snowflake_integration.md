# Dagster Integration Guide: Snowflake Data Warehouse

## Overview

Dagster is a modern data orchestration framework that introduces key concepts like Software-Defined Assets (SDAs), ops, and jobs to create maintainable, testable data pipelines. This guide focuses on integrating Dagster with Snowflake, demonstrating common patterns and best practices.

## Key Concepts

### Software-Defined Assets
SDAs represent data artifacts (tables, files, ML models) as code. They declare their dependencies explicitly and can be materialized independently or as part of larger jobs.

### Ops and Jobs
- **Ops**: Individual units of computation
- **Jobs**: Collections of ops that can be executed together
- **Assets**: Higher-level abstractions that can be composed of multiple ops

## Snowflake Integration Setup

```python
# Required dependencies
from dagster import asset, op, job, DagsterType
from dagster_snowflake import SnowflakeResource
from dagster_snowflake_pandas import SnowflakePandasIOManager

# Configure Snowflake connection
snowflake_config = {
    "account": "your_account",
    "user": "your_user",
    "password": "your_password",
    "database": "your_database",
    "warehouse": "your_warehouse",
    "schema": "your_schema"
}

# Define Snowflake resource
@resource(config_schema={"snowflake": dict})
def snowflake_resource(init_context):
    return SnowflakeResource(
        **init_context.resource_config["snowflake"]
    )
```

## Common Design Patterns

### Pattern 1: ETL Pipeline with Assets

```python
@asset(
    io_manager_key="snowflake_io_manager",
    key_prefix=["raw", "sales"],
    compute_kind="snowflake"
)
def raw_sales_data():
    """Raw sales data loaded from external source."""
    return """
    SELECT * FROM raw_sales_external
    """

@asset(
    io_manager_key="snowflake_io_manager",
    deps=[raw_sales_data],
    key_prefix=["transformed", "sales"]
)
def transformed_sales_data(raw_sales_data):
    """Transform raw sales data with business logic."""
    return f"""
    SELECT 
        date_trunc('month', sale_date) as sale_month,
        product_category,
        sum(sale_amount) as total_sales,
        count(distinct customer_id) as unique_customers
    FROM {raw_sales_data}
    GROUP BY 1, 2
    """
```

### Pattern 2: Incremental Loading

```python
@asset(
    io_manager_key="snowflake_io_manager",
    partitions_def=DailyPartitionsDefinition(start_date="2024-01-01"),
)
def incremental_sales_data(context):
    """Load sales data incrementally by date partition."""
    partition_date = context.asset_partition_key_for_output()
    return f"""
    INSERT INTO sales_daily
    SELECT *
    FROM raw_sales
    WHERE date_trunc('day', event_date) = '{partition_date}'
    """
```

### Pattern 3: Data Quality Checks

```python
@op(required_resource_keys={"snowflake"})
def validate_sales_data(context):
    """Validate sales data quality."""
    results = context.resources.snowflake.execute_query("""
        SELECT 
            COUNT(*) as total_rows,
            COUNT(CASE WHEN sale_amount <= 0 THEN 1 END) as negative_sales,
            COUNT(DISTINCT customer_id) as unique_customers
        FROM transformed_sales_data
    """)
    
    if results[0]['negative_sales'] > 0:
        raise Exception(f"Found {results[0]['negative_sales']} negative sales amounts")
    
    context.log.info(f"Validation passed: {results[0]['total_rows']} rows processed")

@job(resource_defs={"snowflake": snowflake_resource})
def sales_pipeline():
    raw_data = raw_sales_data()
    transformed = transformed_sales_data(raw_data)
    validate_sales_data()
```

## Advanced Patterns

### Multi-Environment Configuration

```python
from dagster import Definitions, load_assets_from_modules

# Define different Snowflake configurations per environment
def get_snowflake_config(env):
    if env == "dev":
        return {
            "account": "dev_account",
            "database": "dev_db",
            # ... other dev configs
        }
    elif env == "prod":
        return {
            "account": "prod_account",
            "database": "prod_db",
            # ... other prod configs
        }

# Load all assets and create definitions
all_assets = load_assets_from_modules([...])

defs = Definitions(
    assets=all_assets,
    resources={
        "snowflake": snowflake_resource.configured(
            {"snowflake": get_snowflake_config(env)}
        )
    }
)
```

### Asset Freshness Policies

```python
@asset(
    freshness_policy=FreshnessPolicy(
        maximum_lag_minutes=60,
        cron_schedule="0 * * * *"  # Hourly
    )
)
def hourly_sales_metrics():
    """Compute sales metrics that should be updated hourly."""
    return """
    SELECT 
        date_trunc('hour', event_timestamp) as hour,
        sum(sale_amount) as hourly_sales
    FROM sales_events
    WHERE event_timestamp >= dateadd('hour', -1, current_timestamp())
    GROUP BY 1
    """
```

## Best Practices

1. **Asset Organization**
   - Group related assets by business domain
   - Use key_prefix to create logical namespacing
   - Keep transformation logic modular and reusable

2. **Resource Management**
   - Use environment-specific configurations
   - Implement proper connection pooling
   - Monitor warehouse usage and costs

3. **Testing and Development**
   - Create mock resources for testing
   - Use smaller data samples in development
   - Implement comprehensive data quality checks

4. **Performance Optimization**
   - Leverage Snowflake materialized views for frequent queries
   - Use appropriate warehouse sizes for different workloads
   - Implement intelligent partitioning strategies

## Common Use Cases

1. **Dimensional Modeling**
   - Building and maintaining dimension tables
   - Fact table generation and updates
   - Slowly Changing Dimension (SCD) implementation

2. **Data Mart Creation**
   - Aggregating data for specific business domains
   - Creating derived metrics and KPIs
   - Managing dependencies between different data marts

3. **Data Quality Management**
   - Implementing data quality checks
   - Monitoring data freshness
   - Handling data validation failures

## Troubleshooting and Monitoring

1. **Logging and Observability**
   - Use context.log for structured logging
   - Implement custom metrics for monitoring
   - Set up alerts for failed materializations

2. **Error Handling**
   - Implement retry logic for transient failures
   - Handle Snowflake-specific errors gracefully
   - Provide clear error messages and recovery steps