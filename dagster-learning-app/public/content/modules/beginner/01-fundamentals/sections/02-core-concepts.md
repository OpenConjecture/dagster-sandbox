---
title: Core Concepts
type: theory
estimatedMinutes: 45
---

# Core Concepts in Dagster

Understanding Dagster's core concepts is essential for building effective data pipelines. Let's explore each concept in detail.

## Software-Defined Assets

Assets are the foundation of Dagster. An **asset** represents a data artifact that your pipeline produces or consumes.

```python
from dagster import asset
import pandas as pd

@asset
def users_table():
    """Raw users data from database"""
    return pd.read_sql("SELECT * FROM users", conn)

@asset
def active_users(users_table):
    """Users who logged in within last 30 days"""
    return users_table[users_table.last_login > thirty_days_ago]
```

### Why Assets Matter
- **Lineage**: Automatically track how data flows through your pipeline
- **Incremental Updates**: Only rebuild what's changed
- **Observability**: Monitor the health of your data products

## Ops (Operations)

Ops are the computational units in Dagster. They're functions that perform specific tasks.

```python
from dagster import op

@op
def download_file(context, url: str) -> str:
    """Download a file and return its path"""
    context.log.info(f"Downloading {url}")
    # Download logic here
    return file_path

@op
def parse_csv(context, file_path: str) -> pd.DataFrame:
    """Parse CSV file into DataFrame"""
    return pd.read_csv(file_path)
```

### Op Configuration
Ops can be configured at runtime:

```python
@op(config_schema={"api_key": str})
def fetch_data(context):
    api_key = context.op_config["api_key"]
    # Use API key to fetch data
```

## Jobs

Jobs define the structure of your pipeline by composing ops together.

```python
from dagster import job

@job
def etl_pipeline():
    file_path = download_file()
    data = parse_csv(file_path)
    process_data(data)
```

### Job Configuration
Jobs can have different configurations for different environments:

```python
@job(
    config={
        "ops": {
            "download_file": {
                "config": {
                    "url": "https://example.com/data.csv"
                }
            }
        }
    }
)
def production_pipeline():
    # Job definition
```

## Resources

Resources provide shared utilities and connections to external systems.

```python
from dagster import resource

@resource
def database_connection(context):
    """Provides database connection"""
    return psycopg2.connect(
        host=context.resource_config["host"],
        port=context.resource_config["port"],
        database=context.resource_config["database"]
    )

@op(required_resource_keys={"db"})
def query_database(context):
    with context.resources.db as conn:
        # Use database connection
```

## Schedules and Sensors

### Schedules
Run jobs at regular intervals:

```python
from dagster import schedule

@schedule(
    cron_schedule="0 0 * * *",  # Daily at midnight
    job=etl_pipeline,
)
def daily_etl_schedule():
    return {}
```

### Sensors
Trigger jobs based on external events:

```python
from dagster import sensor

@sensor(job=etl_pipeline)
def file_sensor(context):
    if check_for_new_files():
        yield RunRequest(run_key="unique_key")
```

## IO Managers

IO Managers handle the storage and retrieval of op outputs and asset materializations.

```python
from dagster import io_manager

@io_manager
def parquet_io_manager(context):
    class ParquetIOManager:
        def load_input(self, context):
            return pd.read_parquet(get_path(context))
        
        def handle_output(self, context, obj):
            obj.to_parquet(get_path(context))
    
    return ParquetIOManager()
```

## Putting It All Together

Here's how these concepts work together:

```python
from dagster import asset, job, schedule, Definitions

# Define assets
@asset
def raw_data():
    return fetch_from_api()

@asset
def processed_data(raw_data):
    return transform(raw_data)

# Create a job
@job
def daily_processing():
    processed_data()

# Schedule the job
@schedule(cron_schedule="0 0 * * *", job=daily_processing)
def daily_schedule():
    return {}

# Bundle everything
defs = Definitions(
    assets=[raw_data, processed_data],
    jobs=[daily_processing],
    schedules=[daily_schedule],
)
```

## Next Steps

Now that you understand the core concepts, let's build your first Dagster pipeline!