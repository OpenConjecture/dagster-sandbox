# Dagster Partitions Guide: Technical Overview and Integration Patterns

## Introduction to Partitions

Dagster Partitions are a powerful abstraction that allow you to divide your data processing workload into discrete chunks that can be processed independently. This is particularly useful for:

1. Processing time-based data in windows (e.g., daily, hourly batches)
2. Handling large datasets by breaking them into manageable pieces
3. Supporting incremental processing and backfills
4. Managing dependencies between partitioned assets

## Core Concepts

### Partition Keys and Partition Sets

A partition key uniquely identifies a specific slice of your data. Partition keys are typically:
- Timestamps (e.g., "2024-01-27")
- Date ranges (e.g., "2024-01-27_to_2024-01-28")
- Category identifiers (e.g., "customer_segment_A")

```python
from dagster import StaticPartitionsDefinition

# Define static partitions
customer_segments = StaticPartitionsDefinition(["segment_a", "segment_b", "segment_c"])

# Define time-based partitions
from dagster import DailyPartitionsDefinition
daily_partitions = DailyPartitionsDefinition(
    start_date="2024-01-01",
    timezone="UTC"
)
```

### Partitioned Assets

Assets can be partitioned to process data incrementally. Each partition represents a subset of the asset's data:

```python
from dagster import asset, DailyPartitionsDefinition

@asset(partitions_def=DailyPartitionsDefinition(start_date="2024-01-01"))
def daily_sales(context):
    date = context.partition_key
    # Load and process data for specific date
    data = load_sales_data(date)
    return process_sales(data)
```

## Common Integration Patterns

### 1. Incremental Processing with Time-based Partitions

This pattern is ideal for processing data that arrives in regular intervals:

```python
from dagster import asset, DailyPartitionsDefinition, AssetIn
import pandas as pd

@asset(
    partitions_def=DailyPartitionsDefinition(start_date="2024-01-01"),
    ins={
        "raw_events": AssetIn(
            partition_mapping=TimeWindowPartitionMapping(
                start_offset=-1,  # Include previous day's data
                end_offset=0
            )
        )
    }
)
def processed_events(context, raw_events):
    """Process events with a sliding window to handle late-arriving data"""
    current_date = context.partition_key
    
    # Process data with overlap to handle late-arriving events
    processed_df = process_with_deduplication(raw_events)
    
    # Write to partition location
    output_path = f"processed_events/{current_date}"
    processed_df.to_parquet(output_path)
    
    return processed_df
```

### 2. Multi-partition Dependencies

When assets depend on multiple partitioned sources:

```python
from dagster import multi_asset, AssetOut, TimeWindowPartitionMapping

@multi_asset(
    partitions_def=DailyPartitionsDefinition(start_date="2024-01-01"),
    outs={
        "combined_metrics": AssetOut(),
        "daily_summary": AssetOut()
    },
    ins={
        "user_events": AssetIn(
            partition_mapping=TimeWindowPartitionMapping(
                start_offset=0,
                end_offset=0
            )
        ),
        "sales_data": AssetIn(
            partition_mapping=TimeWindowPartitionMapping(
                start_offset=0,
                end_offset=0
            )
        )
    }
)
def combine_metrics(user_events, sales_data):
    """Combine metrics from multiple partitioned sources"""
    # Process and combine data
    combined = merge_metrics(user_events, sales_data)
    summary = create_summary(combined)
    
    return combined, summary
```

### 3. Event-Driven Processing with Partitions

Integrating partitioned assets with event-driven workflows:

```python
from dagster import sensor, RunRequest, EventLogEntry
from dagster.core.definitions.sensor_definition import SensorResult

@sensor(asset_selection=AssetSelection.keys("processed_events"))
def new_data_sensor(context):
    """Trigger processing for new data partitions"""
    # Check for new data in source system
    new_partitions = check_for_new_data()
    
    if not new_partitions:
        return SensorResult(skip_reason="No new data found")
    
    # Create run requests for each new partition
    run_requests = []
    for partition in new_partitions:
        run_requests.append(
            RunRequest(
                run_key=f"process_{partition}",
                run_config={
                    "ops": {
                        "processed_events": {
                            "config": {
                                "partition_key": partition
                            }
                        }
                    }
                }
            )
        )
    
    return SensorResult(run_requests=run_requests)
```

## Best Practices and Advanced Features

### 1. Partition Key Selection

Choose partition keys that:
- Align with your data's natural boundaries
- Support your required processing granularity
- Enable efficient querying and processing
- Facilitate dependency management

### 2. Handling Late-Arriving Data

Use time windows and partition mapping to:
- Process overlapping time ranges
- Implement reprocessing logic
- Handle data dependencies across partitions

```python
@asset(
    partitions_def=DailyPartitionsDefinition(start_date="2024-01-01"),
    ins={
        "events": AssetIn(
            partition_mapping=TimeWindowPartitionMapping(
                start_offset=-2,  # Look back 2 days
                end_offset=0
            )
        )
    }
)
def late_data_processor(context, events):
    """Process data with a 2-day lookback window"""
    partition_date = context.partition_key
    
    # Implement deduplication and late data handling
    processed_data = handle_late_arrivals(
        events,
        partition_date,
        lookback_days=2
    )
    
    return processed_data
```

### 3. Dynamic Partition Definitions

For cases where partition keys aren't known in advance:

```python
from dagster import DynamicPartitionsDefinition

dynamic_partitions = DynamicPartitionsDefinition(name="dynamic_customers")

@op(required_resource_keys={"partition_manager"})
def add_customer_partition(context, customer_id):
    """Dynamically add new customer partitions"""
    context.resources.partition_manager.add_partition(
        dynamic_partitions.name,
        customer_id
    )

@asset(partitions_def=dynamic_partitions)
def customer_metrics(context):
    """Process metrics for a specific customer partition"""
    customer_id = context.partition_key
    return process_customer_data(customer_id)
```

## Testing Partitioned Assets

Best practices for testing partitioned assets:

```python
from dagster import build_asset_context
from datetime import datetime

def test_daily_sales():
    # Create test context with specific partition
    context = build_asset_context(
        partition_key="2024-01-27"
    )
    
    # Run asset with test data
    result = daily_sales(context)
    
    # Assert expected outcomes
    assert result.shape[0] > 0
    assert "revenue" in result.columns
```

## Performance Considerations

1. Partition Size
   - Balance between processing overhead and parallelization
   - Consider memory constraints and processing time
   - Align with upstream/downstream system capabilities

2. Caching Strategy
   - Use partition-aware caching
   - Implement efficient partition key lookups
   - Consider storage format and access patterns

3. Resource Management
   - Scale resources based on partition size
   - Implement appropriate timeout and retry logic
   - Monitor partition processing metrics