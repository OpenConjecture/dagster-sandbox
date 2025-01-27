# Dagster Ops Event API Guide

## Overview

Dagster's ops event API enables building event-driven data pipelines by allowing ops (operations) to emit and react to events during execution. This creates flexible, loosely-coupled architectures where data processing can be triggered by various events rather than just scheduled intervals.

## Core Concepts

### Event Types

Dagster ops can emit several types of events:

1. **Output Events** - Represent data produced by an op
2. **Asset Materialization Events** - Indicate persistence of data to a system of record
3. **Observable Events** - Custom events for tracking op execution state
4. **Failure Events** - Signal issues during execution

### Event Handlers 

Events can be handled through:

- Op event handlers (in-process)
- Asset observers (external monitoring)
- Sensors (external triggers)
- Hooks (cross-cutting behavior)

## Implementation Examples

### Basic Event Emission

```python
from dagster import op, Out, DagsterEvent

@op(out={"raw_data": Out(), "processing_complete": Out()})
def extract_data(context):
    # Extract data
    raw_data = fetch_from_source()
    
    # Emit data ready event
    yield DagsterEvent(
        event_type_value="DATA_EXTRACTED",
        message="Raw data extraction complete",
        metadata={"record_count": len(raw_data)}
    )
    
    # Yield actual data
    yield Output(raw_data, output_name="raw_data")
    yield Output(True, output_name="processing_complete")
```

### Event-Based Pipeline

```python
from dagster import job, sensor, RunRequest

@job
def event_driven_etl():
    raw_data = extract_data()
    processed = transform_data(raw_data)
    load_data(processed)

@sensor(job=event_driven_etl)
def new_data_sensor(context):
    # Check for new data events
    if check_for_new_data():
        return RunRequest(
            run_key=f"new_data_{get_timestamp()}",
            run_config={
                "ops": {
                    "extract_data": {
                        "config": {"source": "new_data_location"}
                    }
                }
            }
        )
```

### Asset-Based Events

```python
from dagster import asset, AssetMaterialization, EventMetadataEntry

@asset
def processed_dataset():
    # Process data
    result = process_data()
    
    # Record materialization
    yield AssetMaterialization(
        asset_key="processed_dataset",
        description="Processed dataset ready",
        metadata={
            "row_count": EventMetadataEntry.int(len(result), "Number of rows"),
            "processing_time": EventMetadataEntry.float(time_taken, "Processing time (s)")
        }
    )
    
    return result
```

### Event Hooks

```python
from dagster import success_hook, failure_hook, HookContext

@success_hook(required_resource_keys={"notification_client"})
def notify_success(context: HookContext):
    context.resources.notification_client.send(
        f"Op {context.op.name} completed successfully"
    )

@failure_hook(required_resource_keys={"notification_client"})
def notify_failure(context: HookContext):
    context.resources.notification_client.send(
        f"Op {context.op.name} failed: {context.error}"
    )
```

## Advanced Use Cases

### Event-Based Data Quality Monitoring

```python
from dagster import op, EventMetadataEntry, Failure

@op(required_resource_keys={"metrics_client"})
def validate_data_quality(context, dataset):
    quality_metrics = compute_quality_metrics(dataset)
    
    # Emit quality metrics
    context.log.info(
        "Data quality metrics computed",
        metadata={
            "completeness": EventMetadataEntry.float(
                quality_metrics["completeness"], 
                "Data Completeness Score"
            ),
            "accuracy": EventMetadataEntry.float(
                quality_metrics["accuracy"],
                "Data Accuracy Score"
            )
        }
    )
    
    # Fail if quality threshold not met
    if quality_metrics["completeness"] < 0.95:
        raise Failure(
            description="Data completeness below threshold",
            metadata={
                "completeness": quality_metrics["completeness"],
                "threshold": 0.95
            }
        )
```

### Event-Driven Micro-batch Processing

```python
from dagster import op, DynamicOutput, DynamicOutputDefinition

@op(out=DynamicOutputDefinition())
def process_micro_batches(context, event_stream):
    for batch in event_stream:
        # Process each micro-batch
        processed = process_batch(batch)
        
        # Emit result for each batch
        yield DynamicOutput(
            processed,
            mapping_key=f"batch_{batch.id}",
            metadata={
                "batch_id": batch.id,
                "record_count": len(processed)
            }
        )
```

## Best Practices

1. **Event Granularity**: Choose appropriate event granularity based on your use case. Too fine-grained events can create overhead, while too coarse events may miss important state transitions.

2. **Event Metadata**: Include relevant metadata with events to aid monitoring and debugging:
   - Processing timestamps
   - Record counts
   - Data quality metrics
   - Performance metrics

3. **Error Handling**: Implement comprehensive error handling and emit appropriate failure events with detailed context.

4. **Resource Management**: Use Dagster resources for managing external connections and ensuring proper cleanup.

5. **Testing**: Create unit tests for event emission and handling logic using Dagster's testing utilities.

## Integration Patterns

### Kafka Integration

```python
from dagster import resource, InitResourceContext

@resource
def kafka_consumer(context: InitResourceContext):
    return KafkaConsumer(
        bootstrap_servers=context.resource_config["bootstrap_servers"],
        group_id=context.resource_config["group_id"]
    )

@op(required_resource_keys={"kafka_consumer"})
def process_kafka_events(context):
    consumer = context.resources.kafka_consumer
    
    for message in consumer:
        # Process message
        result = process_message(message)
        
        # Emit processing event
        yield DagsterEvent(
            event_type_value="MESSAGE_PROCESSED",
            message=f"Processed message from topic {message.topic}",
            metadata={
                "topic": message.topic,
                "partition": message.partition,
                "offset": message.offset
            }
        )
```

### Dead Letter Queue Pattern

```python
@op(required_resource_keys={"dlq_client"})
def handle_failed_events(context, failed_events):
    dlq = context.resources.dlq_client
    
    for event in failed_events:
        # Move to DLQ
        dlq.push(event)
        
        # Emit DLQ event
        yield DagsterEvent(
            event_type_value="EVENT_MOVED_TO_DLQ",
            message=f"Event moved to DLQ: {event.id}",
            metadata={
                "event_id": event.id,
                "failure_reason": event.failure_reason
            }
        )
```

## Monitoring and Observability

### Prometheus Integration

```python
from dagster import resource
from prometheus_client import Counter, Histogram

@resource
def metrics_client():
    return {
        "event_counter": Counter(
            "dagster_events_total",
            "Total events processed",
            ["event_type", "status"]
        ),
        "processing_time": Histogram(
            "event_processing_seconds",
            "Time spent processing events",
            ["event_type"]
        )
    }

@op(required_resource_keys={"metrics_client"})
def track_events(context, events):
    metrics = context.resources.metrics_client
    
    for event in events:
        # Update metrics
        metrics["event_counter"].labels(
            event_type=event.type,
            status=event.status
        ).inc()
```

## Conclusion

Dagster's ops event API provides a powerful foundation for building event-driven ETL architectures. By leveraging events, you can create flexible, maintainable data pipelines that react to changes in your data ecosystem while maintaining visibility and control over the entire process.

The patterns and examples in this guide demonstrate common implementation approaches, but the API is flexible enough to accommodate various architectural patterns based on your specific requirements.