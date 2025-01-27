# Integrating Dagster with dbt: Technical Guide and Examples

## Overview

Dagster provides first-class integration with dbt through its `dagster-dbt` package, allowing you to:
- Manage dbt models as Dagster software-defined assets
- Track dependencies between dbt models and other Dagster assets
- Orchestrate dbt runs alongside other data pipeline components
- Monitor and observe dbt runs through Dagster's UI

## Setup and Configuration

First, install the required packages:

```bash
pip install dagster dagster-dbt-cli dbt-core
```

### Basic Project Structure

```
my_dagster_project/
├── setup.py
├── my_dagster_project/
│   ├── __init__.py
│   ├── assets/
│   │   ├── __init__.py
│   │   └── dbt_assets.py
│   ├── jobs/
│   │   ├── __init__.py
│   │   └── dbt_jobs.py
│   └── resources/
│       └── dbt_resource.py
└── dbt_project/
    ├── dbt_project.yml
    ├── models/
    └── profiles.yml
```

## Defining dbt Resources

Here's how to configure the dbt resource in Dagster:

```python
# resources/dbt_resource.py
from dagster_dbt import DbtCliResource

dbt_resource = DbtCliResource(
    project_dir="dbt_project/",
    profiles_dir="dbt_project/",
    target="dev"
)
```

## Loading dbt Models as Assets

### Basic Asset Loading

```python
# assets/dbt_assets.py
from dagster import asset
from dagster_dbt import load_assets_from_dbt_manifest

dbt_assets = load_assets_from_dbt_manifest(
    manifest_path="dbt_project/target/manifest.json",
    select="models/*"
)
```

### Custom Asset Configuration

```python
# assets/dbt_assets.py
from dagster import asset
from dagster_dbt import DbtCliResource, dbt_assets

@asset(
    required_resource_keys={"dbt"},
    group_name="dbt_transformations"
)
def orders_transformed(context):
    # Run specific dbt models
    dbt_result = context.resources.dbt.run(
        models=["orders_transformed"],
        fail_fast=True
    )
    return dbt_result

@asset(
    required_resource_keys={"dbt"},
    deps=["orders_transformed"]
)
def customer_metrics(context):
    # Run dependent dbt models
    dbt_result = context.resources.dbt.run(
        models=["customer_metrics"],
        vars={"date": context.run.tags.get("date")}
    )
    return dbt_result
```

## Creating Jobs with dbt Assets

### Basic Job Definition

```python
# jobs/dbt_jobs.py
from dagster import job, schedule
from ..assets.dbt_assets import dbt_assets
from ..resources.dbt_resource import dbt_resource

@job(resource_defs={"dbt": dbt_resource})
def daily_dbt_job():
    dbt_assets()

@schedule(
    job=daily_dbt_job,
    cron_schedule="0 0 * * *"
)
def daily_dbt_schedule(context):
    return {}
```

### Advanced Job with Mixed Assets

```python
# jobs/dbt_jobs.py
from dagster import job, op, Out, In
from ..assets.dbt_assets import orders_transformed, customer_metrics

@op(required_resource_keys={"dbt"})
def validate_source_data(context):
    # Perform data validation before dbt transformations
    results = context.resources.dbt.run_operation(
        macro_name="validate_sources",
        macro_args={"source_name": "raw_orders"}
    )
    return results

@job(resource_defs={"dbt": dbt_resource})
def etl_job():
    source_validation = validate_source_data()
    orders = orders_transformed(source_validation)
    customer_metrics(orders)
```

## Integrating with External Assets

### Upstream Data Sources

```python
# assets/source_assets.py
from dagster import asset, AssetKey
from dagster_dbt import dbt_assets

@asset(
    key=AssetKey("raw_orders"),
    io_manager_key="warehouse_io_manager"
)
def load_raw_orders(context):
    # Load data from source system
    order_data = context.resources.source_system.extract_orders()
    return order_data

# Integrate with dbt assets
@asset(
    deps=[AssetKey("raw_orders")],
    required_resource_keys={"dbt"}
)
def transformed_orders(context):
    # Run dbt models that depend on raw_orders
    dbt_result = context.resources.dbt.run(
        models=["marts.orders"],
        vars={"execution_date": context.get_runtime_parameter("date")}
    )
    return dbt_result
```

### Downstream Consumers

```python
# assets/reporting_assets.py
from dagster import asset
from dagster_dbt import dbt_assets

@asset(
    deps=[AssetKey("customer_metrics")],
    required_resource_keys={"reporting_client"}
)
def update_customer_dashboard(context):
    # Use transformed data from dbt
    metrics_data = context.resources.warehouse.query("""
        SELECT * FROM {{ ref('customer_metrics') }}
    """)
    
    # Update reporting dashboard
    context.resources.reporting_client.update_dashboard(
        dashboard_id="customer_metrics",
        data=metrics_data
    )
```

## Best Practices and Tips

### Resource Configuration

For different environments, use Dagster's configuration system:

```python
# resources/dbt_resource.py
from dagster import ResourceDefinition

dbt_resource_dev = ResourceDefinition.configure_at_launch(
    DbtCliResource,
    description="Development dbt configuration",
    config={
        "project_dir": "dbt_project/",
        "profiles_dir": "dbt_project/",
        "target": "dev"
    }
)

dbt_resource_prod = ResourceDefinition.configure_at_launch(
    DbtCliResource,
    description="Production dbt configuration",
    config={
        "project_dir": "dbt_project/",
        "profiles_dir": "dbt_project/",
        "target": "prod"
    }
)
```

### Asset Grouping and Organization

Group related assets for better organization:

```python
# assets/dbt_assets.py
from dagster import AssetGroup, with_resources

dbt_asset_group = AssetGroup(
    assets=[orders_transformed, customer_metrics],
    resource_defs={"dbt": dbt_resource}
)

reporting_asset_group = AssetGroup(
    assets=[update_customer_dashboard],
    resource_defs={
        "dbt": dbt_resource,
        "reporting_client": reporting_client
    }
)
```

### Error Handling and Retries

Implement robust error handling:

```python
# assets/dbt_assets.py
from dagster import RetryPolicy, Failure

@asset(
    required_resource_keys={"dbt"},
    retry_policy=RetryPolicy(
        max_retries=3,
        delay=60
    )
)
def critical_dbt_model(context):
    try:
        dbt_result = context.resources.dbt.run(
            models=["critical_model"],
            fail_fast=True
        )
        
        if not dbt_result.success:
            raise Failure(
                description="DBT model failed to execute",
                metadata={
                    "errors": dbt_result.errors,
                    "model": "critical_model"
                }
            )
            
        return dbt_result
        
    except Exception as e:
        context.log.error(f"Error running dbt model: {str(e)}")
        raise
```

## Monitoring and Observability

### Asset Materialization Events

```python
# assets/dbt_assets.py
from dagster import AssetMaterialization, EventMetadata

@asset(required_resource_keys={"dbt"})
def monitored_dbt_model(context):
    dbt_result = context.resources.dbt.run(
        models=["monitored_model"]
    )
    
    # Emit materialization event with metadata
    yield AssetMaterialization(
        asset_key="monitored_model",
        description="DBT model execution completed",
        metadata={
            "row_count": EventMetadata.int(dbt_result.metrics.get("row_count", 0)),
            "execution_time": EventMetadata.float(
                dbt_result.metrics.get("execution_time", 0.0)
            ),
            "status": EventMetadata.text(dbt_result.status)
        }
    )
    
    return dbt_result
```

This guide demonstrates the key concepts and patterns for integrating Dagster with dbt, focusing on practical examples and real-world scenarios. The examples can be adapted and extended based on your specific needs and requirements.