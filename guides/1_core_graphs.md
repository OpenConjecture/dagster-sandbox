# Dagster Graphs: Technical Guide & Implementation

## Overview
Graphs in Dagster are a fundamental abstraction that allows you to compose operations (ops) into larger units of workflow organization. A graph defines the topology of data dependencies between ops, enabling you to create complex data pipelines while maintaining modularity and reusability.

## Key Concepts

### 1. Graph Structure
- Graphs are composed of nodes (ops) and edges (dependencies)
- Each edge represents a data dependency between ops
- Graphs can be nested within other graphs
- Graphs are statically defined at build time

### 2. Core Benefits
- Modularity: Break complex pipelines into manageable pieces
- Reusability: Package related ops together for use across jobs
- Maintainability: Change implementations without affecting dependent code
- Testability: Test graphs in isolation or as part of larger jobs

## Implementation Guide

### Basic Graph Creation

```python
from dagster import graph, op

@op
def get_data():
    return [1, 2, 3, 4, 5]

@op
def process_data(data):
    return [x * 2 for x in data]

@op
def store_results(processed_data):
    print(f"Storing results: {processed_data}")

@graph
def basic_pipeline():
    data = get_data()
    processed = process_data(data)
    store_results(processed)
```

### Advanced Graph Patterns

#### 1. Graphs with Multiple Inputs/Outputs

```python
from dagster import Out, Output, graph, op

@op(out={"success": Out(), "error": Out()})
def validate_data(data):
    if all(isinstance(x, (int, float)) for x in data):
        yield Output(data, "success")
    else:
        yield Output("Invalid data format", "error")

@op
def handle_success(data):
    return f"Successfully processed: {data}"

@op
def handle_error(error_msg):
    return f"Error occurred: {error_msg}"

@graph
def branching_pipeline():
    data = get_data()
    success, error = validate_data(data)
    handle_success(success)
    handle_error(error)
```

#### 2. Nested Graphs

```python
@graph
def data_validation_subgraph():
    data = get_data()
    return validate_data(data)

@graph
def main_pipeline():
    success, error = data_validation_subgraph()
    handle_success(success)
    handle_error(error)
```

### Graph Configuration

#### 1. Config Schema Definition

```python
from dagster import Config, graph

class DataProcessingConfig(Config):
    batch_size: int
    processing_mode: str

@op
def process_with_config(config: DataProcessingConfig, data):
    batch_size = config.batch_size
    mode = config.processing_mode
    # Process data according to config
    return processed_data

@graph
def configurable_pipeline():
    data = get_data()
    processed = process_with_config(data)
    store_results(processed)
```

#### 2. Graph Resources

```python
from dagster import ResourceDefinition, graph, op

class DatabaseConnection:
    def __init__(self, connection_string):
        self.connection_string = connection_string

    def store_data(self, data):
        # Implementation

database_resource = ResourceDefinition.hardcoded(
    DatabaseConnection("postgresql://...")
)

@op(required_resource_keys={"database"})
def store_in_db(context, data):
    context.resources.database.store_data(data)

@graph
def database_pipeline():
    data = get_data()
    processed = process_data(data)
    store_in_db(processed)
```

## Testing Strategies

### 1. Unit Testing Graphs

```python
from dagster import build_op_context

def test_data_validation_subgraph():
    result = data_validation_subgraph().execute_in_process()
    assert result.success
    assert "success" in result.output_for_node("validate_data")

def test_process_with_config():
    context = build_op_context(
        config={"batch_size": 10, "processing_mode": "fast"}
    )
    result = process_with_config(context, [1, 2, 3, 4, 5])
    assert result.success
```

### 2. Integration Testing

```python
def test_full_pipeline():
    result = main_pipeline.execute_in_process(
        run_config={
            "resources": {
                "database": {"config": {"connection_string": "test_db://"}}
            }
        }
    )
    assert result.success
```

## Best Practices

1. **Graph Composition**
   - Keep graphs focused and single-purpose
   - Use nested graphs to manage complexity
   - Consider creating utility graphs for common patterns

2. **Error Handling**
   - Use multiple outputs for error cases
   - Implement proper cleanup in case of failures
   - Consider retry policies for flaky operations

3. **Testing**
   - Test graphs in isolation
   - Use mock resources for external dependencies
   - Test both success and failure paths

4. **Configuration**
   - Use config schemas for runtime configuration
   - Keep resource definitions separate from business logic
   - Use environment variables for sensitive information

## Common Patterns

### 1. Fan-Out/Fan-In

```python
@graph
def parallel_processing():
    data = get_data()
    # Fan out
    processed_chunks = [process_chunk(chunk) for chunk in split_data(data)]
    # Fan in
    merged = merge_results(processed_chunks)
    store_results(merged)
```

### 2. Conditional Execution

```python
@graph
def conditional_pipeline():
    data = get_data()
    if should_process(data):
        processed = process_data(data)
        store_results(processed)
    else:
        skip_processing(data)
```

## Troubleshooting

1. **Common Issues**
   - Circular dependencies
   - Missing inputs/outputs
   - Resource configuration errors

2. **Debugging Tips**
   - Use `dagster-debug` CLI tool
   - Enable detailed logging
   - Check graph visualization in Dagit

## Advanced Topics

### 1. Dynamic Graphs

```python
@graph
def dynamic_pipeline():
    data = get_data()
    for chunk in dynamic_split(data):
        process_and_store(chunk)
```

### 2. Graph Composition with Types

```python
from dagster import DagsterType, usable_as_dagster_type

@usable_as_dagster_type
class ProcessedData:
    def __init__(self, data):
        self.data = data

@op(out=DagsterType(ProcessedData))
def process_with_type(data):
    return ProcessedData(data)
```

## Performance Optimization

1. **Caching Strategies**
   - Use memoization for expensive computations
   - Implement output materialization
   - Configure proper cache storage

2. **Resource Management**
   - Pool connections appropriately
   - Implement proper cleanup
   - Monitor resource usage

## Integration Examples

### 1. External Systems

```python
@graph
def etl_pipeline():
    raw_data = extract_from_source()
    transformed = transform_data(raw_data)
    load_to_destination(transformed)
```

### 2. Monitoring and Alerting

```python
@op(required_resource_keys={"alerts"})
def monitor_pipeline(context, data):
    if has_anomalies(data):
        context.resources.alerts.send_alert("Anomaly detected")
```

Remember that these examples and patterns can be adapted and combined to suit your specific use case. The power of Dagster's graph abstraction lies in its flexibility and composability.