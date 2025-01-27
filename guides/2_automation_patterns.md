# Comprehensive Guide to Dagster Automation Patterns

## Introduction

Dagster provides several powerful mechanisms for automating job execution. This guide covers the main automation patterns:
- Declarative Scheduling
- Schedule Decorators
- Sensors
- Asset Sensors

## Declarative Scheduling

Declarative scheduling allows you to define schedules directly in your repository configuration. This approach is ideal when you have static scheduling requirements that don't need complex logic.

```python
from dagster import Definitions, define_asset_job, load_assets_from_modules

from . import assets

jobs = [define_asset_job("daily_refresh", selection="*")]

defs = Definitions(
    assets=load_assets_from_modules([assets]),
    jobs=jobs,
    schedules=[
        ScheduleDefinition(
            job=jobs[0],
            cron_schedule="0 0 * * *",  # Daily at midnight
            execution_timezone="America/New_York",
        )
    ]
)
```

### Key Features:
- Simple configuration using cron syntax
- Timezone support
- Integration with asset-based jobs
- Easy to maintain and version control

## Schedule Decorators

When you need more dynamic scheduling logic, the `@schedule` decorator provides a programmatic approach to scheduling.

```python
from dagster import schedule, RunConfig

@schedule(
    cron_schedule="0 0 * * *",
    job_name="process_daily_data",
    execution_timezone="UTC"
)
def my_daily_schedule(context):
    date = context.scheduled_execution_time.strftime("%Y-%m-%d")
    return RunConfig(
        run_key=date,
        tags={"date": date},
        ops={
            "process_data": {
                "config": {
                    "date": date
                }
            }
        }
    )
```

### Advanced Schedule Configuration:
```python
@schedule(
    cron_schedule="0 */4 * * *",  # Every 4 hours
    job_name="batch_processing",
    should_execute=lambda context: is_business_hour(),
    environment_vars={"PROCESSING_MODE": "batch"}
)
def conditional_schedule(context):
    # Dynamic configuration based on time
    current_hour = context.scheduled_execution_time.hour
    batch_size = 1000 if current_hour < 12 else 500
    
    return RunConfig(
        ops={
            "process_batch": {
                "config": {"batch_size": batch_size}
            }
        }
    )
```

## Sensors

Sensors enable event-driven workflows by monitoring for specific conditions or changes. They're perfect for creating reactive data pipelines.

### Basic File Sensor
```python
from dagster import sensor, RunRequest, SensorResult

@sensor(job_name="process_new_file")
def file_sensor(context):
    directory = "/path/to/watch"
    new_files = get_unprocessed_files(directory)
    
    run_requests = []
    for file_path in new_files:
        run_requests.append(
            RunRequest(
                run_key=f"file_{file_path}",
                run_config={
                    "ops": {
                        "process_file": {
                            "config": {"file_path": file_path}
                        }
                    }
                }
            )
        )
    
    return SensorResult(run_requests=run_requests)
```

### Advanced API Sensor
```python
@sensor(job_name="process_api_data")
def api_sensor(context):
    # Get last processed timestamp from sensor state
    last_timestamp = context.cursor or "0"
    
    # Check for new data
    new_data = api_client.get_new_records(since=last_timestamp)
    if not new_data:
        return SkipReason("No new data available")
    
    # Update cursor
    new_cursor = str(max(record["timestamp"] for record in new_data))
    
    return SensorResult(
        run_requests=[
            RunRequest(
                run_key=f"api_data_{new_cursor}",
                run_config={"ops": {"process_data": {"config": {"data": new_data}}}}
            )
        ],
        cursor=new_cursor
    )
```

## Asset Sensors

Asset sensors specifically monitor for changes in Dagster assets, enabling downstream processing when upstream assets are updated.

### Basic Asset Sensor
```python
from dagster import asset_sensor, AssetKey

@asset_sensor(asset_key=AssetKey("raw_data"), job_name="process_raw_data")
def raw_data_sensor(context):
    if context.asset_event.dagster_event.event_type_value == "MATERIALIZE":
        return RunRequest(
            run_key=context.cursor,
            run_config={
                "ops": {
                    "transform_data": {
                        "config": {
                            "input_path": context.asset_event.dagster_event.materialization.metadata["path"]
                        }
                    }
                }
            }
        )
```

### Multi-Asset Sensor
```python
from dagster import multi_asset_sensor

@multi_asset_sensor(
    asset_keys=[AssetKey("users"), AssetKey("orders")],
    job_name="generate_user_report"
)
def user_order_sensor(context):
    # Check if both assets have been updated
    user_materialization = context.latest_materialization_by_key[AssetKey("users")]
    order_materialization = context.latest_materialization_by_key[AssetKey("orders")]
    
    if user_materialization and order_materialization:
        return RunRequest(
            run_key=f"report_{context.cursor}",
            run_config={
                "ops": {
                    "generate_report": {
                        "config": {
                            "user_data": user_materialization.metadata["path"],
                            "order_data": order_materialization.metadata["path"]
                        }
                    }
                }
            }
        )
```

## Best Practices

1. **Cursor Management**
   - Always use cursors in sensors to track state
   - Implement idempotent run keys to prevent duplicate runs

2. **Error Handling**
   - Include robust error handling in sensor callbacks
   - Use SkipReason to provide context when skipping runs

3. **Performance**
   - Keep sensor evaluations light and fast
   - Avoid heavy computations in sensor callbacks
   - Use batching when processing multiple items

4. **Monitoring**
   - Implement logging in sensors for debugging
   - Use tags to track sensor-initiated runs
   - Monitor sensor evaluation time and frequency

## Common Patterns

### Combining Multiple Automation Types
```python
# Hybrid approach using both schedule and sensor
@schedule(cron_schedule="0 * * * *")
def hourly_check_schedule(context):
    return RunConfig(
        run_key=context.scheduled_execution_time.isoformat(),
        ops={"check_status": {"config": {"mode": "scheduled"}}}
    )

@sensor(job_name="process_data")
def data_sensor(context):
    if detected_changes():
        return RunRequest(
            run_key=f"sensor_{time.time()}",
            ops={"process_data": {"config": {"mode": "reactive"}}}
        )
```

### Conditional Execution
```python
@sensor(job_name="conditional_job")
def conditional_sensor(context):
    if not should_run_now():
        return SkipReason("Conditions not met")
        
    return RunRequest(
        run_key=generate_run_key(),
        tags={"source": "conditional_sensor"}
    )
```

This guide covers the main automation patterns in Dagster and provides practical examples for implementation. Each pattern has its use cases, and often they can be combined to create sophisticated automation strategies.