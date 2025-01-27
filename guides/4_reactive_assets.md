# Dagster Sensor Assets: Technical Guide

## Overview

Sensor assets in Dagster provide a powerful abstraction for monitoring external systems and automatically triggering asset materializations when changes are detected. They bridge the gap between Dagster's asset-based data platform and external systems, enabling reactive data pipelines.

## Key Concepts

### What is a Sensor Asset?

A sensor asset is a combination of two key components:
1. A monitoring function that checks an external system
2. An asset materialization that occurs when the monitor detects relevant changes

The sensor component runs on a configured interval, while the asset component defines the computation that should occur when new data is available.

### Core Benefits

- **Declarative Dependencies**: Explicitly model external dependencies in your asset graph
- **Automatic Materialization**: Assets update automatically when source data changes
- **Failure Handling**: Built-in retry logic and error handling
- **Observability**: Track lineage and monitor sensor execution status

## Implementation Patterns

### Basic Sensor Asset

```python
from dagster import AssetSensor, asset_sensor, RunRequest, SensorResult
from dagster_aws.s3 import S3Resource

@asset_sensor(asset_key=["raw_customer_data"])
def customer_data_sensor(context):
    s3 = context.resources.s3
    
    # Check if new data exists in S3
    new_data = s3.list_objects_v2(
        Bucket="my-data-bucket",
        Prefix="customer_data/",
        StartAfter=context.cursor or ""
    )
    
    if not new_data["Contents"]:
        return SensorResult(skip_reason="No new data found")
        
    # Get latest file
    latest_key = new_data["Contents"][-1]["Key"]
    
    # Update cursor
    context.update_cursor(latest_key)
    
    # Request asset materialization
    return RunRequest(
        run_key=latest_key,
        run_config={"ops": {"process_customer_data": {"config": {"file_key": latest_key}}}}
    )

@asset(required_resource_keys={"s3"})
def processed_customer_data(context, raw_customer_data):
    # Process the data when sensor triggers
    s3 = context.resources.s3
    raw_data = s3.get_object(
        Bucket="my-data-bucket",
        Key=context.op_config["file_key"]
    )
    # Transform data...
    return transformed_data
```

### Multi-Asset Sensor

```python
@asset_sensor(asset_keys=[["raw_orders"], ["raw_customers"]])
def multi_table_sensor(context):
    # Check multiple upstream dependencies
    orders_modified = check_orders_table()
    customers_modified = check_customers_table()
    
    if not (orders_modified or customers_modified):
        return SensorResult(skip_reason="No changes detected")
    
    # Trigger relevant assets based on what changed
    run_requests = []
    if orders_modified:
        run_requests.append(RunRequest(
            run_key=f"orders_{context.cursor}",
            asset_selection=["processed_orders"]
        ))
    if customers_modified:
        run_requests.append(RunRequest(
            run_key=f"customers_{context.cursor}",
            asset_selection=["processed_customers"]
        ))
    
    return run_requests

@asset
def processed_orders(raw_orders):
    # Process orders when sensor triggers
    pass

@asset
def processed_customers(raw_customers):
    # Process customers when sensor triggers
    pass
```

### Conditional Sensor Logic

```python
@asset_sensor(asset_key=["raw_data"])
def conditional_sensor(context):
    # Check external system
    metadata = check_external_system()
    
    if not should_process(metadata):
        return SensorResult(skip_reason="Processing conditions not met")
    
    # Different processing paths based on data characteristics
    if metadata["type"] == "incremental":
        return RunRequest(
            run_key=f"incremental_{context.cursor}",
            asset_selection=["incremental_processed_data"]
        )
    else:
        return RunRequest(
            run_key=f"full_{context.cursor}",
            asset_selection=["full_processed_data"]
        )

def should_process(metadata):
    # Custom logic to determine if processing should occur
    return (
        metadata["size"] > MIN_BATCH_SIZE and
        metadata["quality_score"] > QUALITY_THRESHOLD
    )
```

## Best Practices

### Cursor Management

- Always update the cursor after successful checks
- Use meaningful cursor values (timestamps, file keys, etc.)
- Handle cursor initialization gracefully

```python
@asset_sensor(asset_key=["source_data"])
def cursor_example(context):
    # Initialize cursor if needed
    if not context.cursor:
        context.update_cursor(get_initial_cursor())
    
    # Use cursor in query
    new_records = query_since(context.cursor)
    
    if not new_records:
        return SensorResult(skip_reason="No new records")
    
    # Update cursor to latest processed record
    context.update_cursor(new_records[-1].timestamp)
    
    return RunRequest(
        run_key=str(new_records[-1].timestamp),
        run_config={"ops": {"process_records": {"config": {"new_record_ids": [r.id for r in new_records]}}}}
    )
```

### Error Handling

- Implement robust error handling in sensor logic
- Use appropriate retry policies
- Log meaningful error messages

```python
@asset_sensor(asset_key=["external_data"])
def robust_sensor(context):
    try:
        metadata = check_external_system()
    except ConnectionError as e:
        context.log.error(f"Failed to connect to external system: {e}")
        return SensorResult(skip_reason="Connection error")
    except Exception as e:
        context.log.error(f"Unexpected error in sensor: {e}")
        raise
    
    # Process successful check
    if not metadata["new_data"]:
        return SensorResult(skip_reason="No new data")
    
    return RunRequest(
        run_key=metadata["version"],
        run_config={"ops": {"process_data": {"config": {"version": metadata["version"]}}}}
    )
```

### Configuration Management

- Use resource configurations for external system credentials
- Make sensor intervals configurable
- Allow for environment-specific settings

```python
@resource(config_schema={"api_key": str, "endpoint": str})
def external_system_resource(context):
    return ExternalSystemClient(
        api_key=context.resource_config["api_key"],
        endpoint=context.resource_config["endpoint"]
    )

@asset_sensor(
    asset_key=["monitored_data"],
    minimum_interval_seconds=config.get("sensor_interval", 300)
)
def configurable_sensor(context):
    client = context.resources.external_system
    # Use configured client to check for updates
    pass
```

## Common Patterns and Anti-patterns

### Do's:
- Keep sensor logic focused and simple
- Use meaningful run keys
- Implement proper cursor management
- Add appropriate logging and monitoring
- Handle edge cases and errors gracefully

### Don'ts:
- Perform heavy processing in sensor logic
- Ignore cursor management
- Hard-code external system configurations
- Skip error handling
- Create overly complex sensor conditions

## Testing

```python
from dagster import build_sensor_context
from dagster_test import mock_s3_resource

def test_s3_sensor():
    # Mock S3 resource
    mock_s3 = mock_s3_resource({
        "my-bucket": {
            "data/file1.csv": "content1",
            "data/file2.csv": "content2"
        }
    })
    
    # Create test context
    context = build_sensor_context(
        resources={"s3": mock_s3},
        cursor="data/file1.csv"
    )
    
    # Run sensor
    result = customer_data_sensor(context)
    
    # Assert expected behavior
    assert isinstance(result, RunRequest)
    assert result.run_key == "data/file2.csv"
    assert context.cursor == "data/file2.csv"
```

## Advanced Topics

### Backfilling Sensor Assets

```python
from dagster import BackfillPolicy

@asset(
    backfill_policy=BackfillPolicy.latest_only()
)
def sensor_driven_asset(context, upstream_data):
    # Only processes most recent data during backfills
    pass
```

### Complex Dependency Patterns

```python
@asset_sensor(asset_keys=[["table1"], ["table2"], ["table3"]])
def complex_dependency_sensor(context):
    # Track multiple cursors
    cursors = context.cursor or {"table1": None, "table2": None, "table3": None}
    
    # Check each dependency
    updates = {
        "table1": check_table1(cursors["table1"]),
        "table2": check_table2(cursors["table2"]),
        "table3": check_table3(cursors["table3"])
    }
    
    # Update cursors
    new_cursors = {
        table: update["cursor"] if update["changed"] else cursors[table]
        for table, update in updates.items()
    }
    context.update_cursor(new_cursors)
    
    # Generate run requests based on changes
    return [
        RunRequest(
            run_key=f"{table}_{update['cursor']}",
            asset_selection=[f"processed_{table}"]
        )
        for table, update in updates.items()
        if update["changed"]
    ]
```

## Monitoring and Observability

### Logging

```python
@asset_sensor(asset_key=["monitored_data"])
def observable_sensor(context):
    context.log.info(
        "Starting sensor check",
        cursor=context.cursor,
        extra_metadata={"last_success": context.last_run_key}
    )
    
    try:
        changes = check_for_changes(context.cursor)
    except Exception as e:
        context.log.error(
            "Sensor check failed",
            error=str(e),
            stacktrace=traceback.format_exc()
        )
        raise
    
    context.log.info(
        "Sensor check complete",
        changes_detected=bool(changes),
        next_cursor=changes[-1].id if changes else None
    )
    
    if not changes:
        return SensorResult(skip_reason="No changes detected")
    
    return RunRequest(
        run_key=str(changes[-1].id),
        run_config={"ops": {"process_changes": {"config": {"change_ids": [c.id for c in changes]}}}}
    )
```

## Performance Considerations

- Keep sensor checks lightweight
- Use appropriate minimum intervals
- Implement batch processing when possible
- Consider caching strategies
- Monitor sensor execution times

Remember that sensors run frequently, so their logic should be efficient and focused on detecting changes rather than processing data. The actual data processing should happen in the asset materializations that the sensors trigger.