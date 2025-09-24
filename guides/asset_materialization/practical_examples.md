# Practical Examples: Asset Materialization Patterns

## Overview

This document provides real-world examples and patterns for implementing efficient asset materialization in Dagster, covering common scenarios data teams encounter in production environments.

## Small Data Examples (< 100MB per asset)

### Example 1: E-commerce Analytics Pipeline

```python
from dagster import asset, Definitions, FilesystemIOManager, Output, MetadataValue
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Use default filesystem I/O manager for small data
@asset(description="Raw order data from e-commerce platform")
def orders_raw() -> pd.DataFrame:
    """Simulate fetching order data from API"""
    # In production, this would fetch from your e-commerce API
    np.random.seed(42)
    n_orders = 10000
    
    orders = pd.DataFrame({
        'order_id': range(n_orders),
        'customer_id': np.random.randint(1, 1000, n_orders),
        'product_id': np.random.randint(1, 100, n_orders),
        'quantity': np.random.randint(1, 5, n_orders),
        'price': np.random.uniform(10, 500, n_orders),
        'order_date': pd.date_range('2024-01-01', periods=n_orders, freq='H')
    })
    
    return orders

@asset(description="Customer lifetime value calculations")
def customer_ltv(orders_raw: pd.DataFrame) -> Output[pd.DataFrame]:
    """Calculate customer lifetime value metrics"""
    
    customer_metrics = orders_raw.groupby('customer_id').agg({
        'price': ['sum', 'mean', 'count'],
        'order_date': ['min', 'max']
    }).round(2)
    
    # Flatten column names
    customer_metrics.columns = ['total_spent', 'avg_order_value', 'order_count', 'first_order', 'last_order']
    
    # Calculate days as customer
    customer_metrics['customer_days'] = (
        customer_metrics['last_order'] - customer_metrics['first_order']
    ).dt.days + 1
    
    # Calculate LTV score
    customer_metrics['ltv_score'] = (
        customer_metrics['total_spent'] * 
        (customer_metrics['order_count'] / customer_metrics['customer_days']) * 365
    )
    
    return Output(
        value=customer_metrics,
        metadata={
            "total_customers": len(customer_metrics),
            "avg_ltv": float(customer_metrics['ltv_score'].mean()),
            "high_value_customers": int((customer_metrics['ltv_score'] > 1000).sum()),
            "data_size_mb": customer_metrics.memory_usage(deep=True).sum() / 1024 / 1024
        }
    )

@asset(description="Product performance analysis")
def product_performance(orders_raw: pd.DataFrame) -> pd.DataFrame:
    """Analyze product sales performance"""
    
    product_metrics = orders_raw.groupby('product_id').agg({
        'quantity': 'sum',
        'price': ['sum', 'mean'],
        'order_id': 'nunique'
    })
    
    product_metrics.columns = ['total_quantity', 'total_revenue', 'avg_price', 'unique_orders']
    
    # Calculate performance score
    product_metrics['performance_score'] = (
        product_metrics['total_revenue'] * 0.6 +
        product_metrics['total_quantity'] * 0.3 +
        product_metrics['unique_orders'] * 0.1
    )
    
    return product_metrics.sort_values('performance_score', ascending=False)

# Configuration for small data deployment
small_data_config = Definitions(
    assets=[orders_raw, customer_ltv, product_performance],
    resources={
        "io_manager": FilesystemIOManager(base_dir="./analytics_data")
    }
)

# Expected overhead: 
# - Memory: ~50MB peak (during DataFrame operations)
# - Storage: ~15MB total (compressed DataFrames)
# - Execution time: 2-5 seconds per asset
```

### Example 2: Marketing Attribution

```python
from dagster import asset, multi_asset, AssetOut, DailyPartitionsDefinition
from typing import Dict, List

# Daily partitions for incremental processing
daily_partitions = DailyPartitionsDefinition(start_date="2024-01-01")

@asset(partitions_def=daily_partitions, description="Daily marketing campaign data")
def campaign_data(context) -> pd.DataFrame:
    """Load daily campaign performance data"""
    date = context.partition_key
    
    # Simulate API call to marketing platforms
    campaigns = pd.DataFrame({
        'campaign_id': range(50),
        'channel': np.random.choice(['google', 'facebook', 'email'], 50),
        'spend': np.random.uniform(100, 1000, 50),
        'impressions': np.random.randint(1000, 10000, 50),
        'clicks': np.random.randint(50, 500, 50),
        'conversions': np.random.randint(5, 50, 50),
        'date': date
    })
    
    return campaigns

@multi_asset(
    partitions_def=daily_partitions,
    outs={
        "attribution_model": AssetOut(description="Marketing attribution calculations"),
        "channel_performance": AssetOut(description="Channel-level performance metrics")
    }
)
def marketing_analytics(campaign_data: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """Calculate marketing attribution and channel performance"""
    
    # Attribution model (simplified last-touch)
    attribution = campaign_data.copy()
    attribution['cost_per_conversion'] = attribution['spend'] / attribution['conversions']
    attribution['conversion_rate'] = attribution['conversions'] / attribution['clicks']
    attribution['ctr'] = attribution['clicks'] / attribution['impressions']
    
    # Channel performance aggregation
    channel_perf = campaign_data.groupby('channel').agg({
        'spend': 'sum',
        'impressions': 'sum',
        'clicks': 'sum',
        'conversions': 'sum'
    })
    
    channel_perf['roas'] = channel_perf['conversions'] * 50 / channel_perf['spend']  # Assume $50 per conversion
    
    return {
        "attribution_model": attribution,
        "channel_performance": channel_perf
    }

# Partition benefits:
# - Only processes new daily data
# - Enables parallel backfills
# - Supports incremental refreshes
```

## Medium Data Examples (100MB - 1GB per asset)

### Example 3: Log Analysis with Custom I/O Manager

```python
from dagster import IOManager, OutputContext, InputContext, ConfigurableIOManagerFactory
import pyarrow as pa
import pyarrow.parquet as pq
from upath import UPath

class ParquetIOManager(IOManager):
    """Custom I/O manager optimized for medium-sized DataFrames"""
    
    def __init__(self, base_path: str, compression: str = "snappy"):
        self.base_path = UPath(base_path)
        self.compression = compression
    
    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        path = self._get_path(context)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Optimized Parquet storage
        obj.to_parquet(
            path, 
            compression=self.compression,
            index=False,
            engine='pyarrow'
        )
        
        # Add metadata about storage efficiency
        file_size_mb = path.stat().st_size / 1024 / 1024
        memory_size_mb = obj.memory_usage(deep=True).sum() / 1024 / 1024
        
        context.add_output_metadata({
            "file_size_mb": file_size_mb,
            "memory_size_mb": memory_size_mb,
            "compression_ratio": memory_size_mb / file_size_mb,
            "rows": len(obj),
            "columns": len(obj.columns)
        })
    
    def load_input(self, context: InputContext) -> pd.DataFrame:
        path = self._get_path(context)
        return pd.read_parquet(path)
    
    def _get_path(self, context) -> UPath:
        if context.has_asset_key:
            return self.base_path / f"{context.asset_key.path[-1]}.parquet"
        else:
            return self.base_path / f"{context.step_key}_{context.name}.parquet"

@asset(description="Raw web server logs (500MB typical)")
def web_logs_raw() -> pd.DataFrame:
    """Process web server logs"""
    # Simulate large log file processing
    n_logs = 2_000_000  # 2M log entries ≈ 500MB
    
    logs = pd.DataFrame({
        'timestamp': pd.date_range('2024-01-01', periods=n_logs, freq='30S'),
        'ip_address': [f"192.168.{np.random.randint(1,255)}.{np.random.randint(1,255)}" for _ in range(n_logs)],
        'user_agent': np.random.choice(['Chrome', 'Firefox', 'Safari', 'Edge'], n_logs),
        'url': np.random.choice(['/home', '/products', '/checkout', '/api/data'], n_logs),
        'status_code': np.random.choice([200, 404, 500, 301], n_logs, p=[0.8, 0.1, 0.05, 0.05]),
        'response_time_ms': np.random.exponential(100, n_logs),
        'bytes_sent': np.random.exponential(1024, n_logs)
    })
    
    return logs

@asset(description="Processed web analytics")
def web_analytics(web_logs_raw: pd.DataFrame) -> Output[pd.DataFrame]:
    """Generate web analytics from logs"""
    
    # Hourly aggregations
    web_logs_raw['hour'] = web_logs_raw['timestamp'].dt.floor('H')
    
    analytics = web_logs_raw.groupby(['hour', 'url']).agg({
        'ip_address': 'nunique',  # Unique visitors
        'status_code': ['count', lambda x: (x == 200).sum()],
        'response_time_ms': ['mean', 'p95'],
        'bytes_sent': 'sum'
    }).round(2)
    
    # Flatten column names
    analytics.columns = ['unique_visitors', 'total_requests', 'successful_requests', 
                        'avg_response_time', 'p95_response_time', 'total_bytes']
    
    # Calculate success rate
    analytics['success_rate'] = analytics['successful_requests'] / analytics['total_requests']
    
    return Output(
        value=analytics,
        metadata={
            "processed_hours": len(analytics),
            "total_requests": int(analytics['total_requests'].sum()),
            "avg_success_rate": float(analytics['success_rate'].mean()),
            "peak_traffic_hour": str(analytics['total_requests'].idxmax()[0])
        }
    )

# Use custom I/O manager for better performance
medium_data_config = Definitions(
    assets=[web_logs_raw, web_analytics],
    resources={
        "io_manager": ParquetIOManager(base_path="./web_analytics", compression="gzip")
    }
)

# Expected improvements over default:
# - 60-70% smaller storage (Parquet vs Pickle)
# - 40-50% faster I/O (columnar format)
# - Better compression with gzip
```

### Example 4: Time Series Processing

```python
from dagster import asset, HourlyPartitionsDefinition
import pandas as pd
from typing import Optional

# Hourly partitions for high-frequency data
hourly_partitions = HourlyPartitionsDefinition(start_date="2024-01-01-00:00")

@asset(partitions_def=hourly_partitions, description="IoT sensor data")
def sensor_data(context) -> pd.DataFrame:
    """Load hourly IoT sensor readings"""
    hour = context.partition_key
    
    # Simulate 10k sensors reporting every minute
    n_readings = 10_000 * 60  # 600k readings per hour
    
    sensor_readings = pd.DataFrame({
        'sensor_id': np.random.randint(1, 10000, n_readings),
        'timestamp': pd.date_range(hour, periods=n_readings, freq='6S'),  # Every 6 seconds
        'temperature': np.random.normal(20, 5, n_readings),
        'humidity': np.random.normal(50, 10, n_readings),
        'pressure': np.random.normal(1013, 50, n_readings),
        'battery_level': np.random.uniform(0, 100, n_readings)
    })
    
    return sensor_readings

@asset(partitions_def=hourly_partitions, description="Sensor anomaly detection")
def sensor_anomalies(sensor_data: pd.DataFrame) -> pd.DataFrame:
    """Detect anomalies in sensor readings"""
    
    # Calculate rolling statistics for anomaly detection
    sensor_data = sensor_data.sort_values(['sensor_id', 'timestamp'])
    
    # Group by sensor and calculate rolling metrics
    sensor_groups = sensor_data.groupby('sensor_id')
    
    anomalies = []
    for sensor_id, group in sensor_groups:
        # Calculate rolling mean and std
        group['temp_rolling_mean'] = group['temperature'].rolling(window=10, min_periods=5).mean()
        group['temp_rolling_std'] = group['temperature'].rolling(window=10, min_periods=5).std()
        
        # Detect anomalies (> 3 sigma)
        group['temp_anomaly'] = abs(group['temperature'] - group['temp_rolling_mean']) > (3 * group['temp_rolling_std'])
        
        # Similar for other metrics
        group['humidity_anomaly'] = group['humidity'] < 10  # Very low humidity
        group['battery_anomaly'] = group['battery_level'] < 10  # Low battery
        
        # Keep only anomalous readings
        sensor_anomalies = group[
            group['temp_anomaly'] | group['humidity_anomaly'] | group['battery_anomaly']
        ]
        
        if len(sensor_anomalies) > 0:
            anomalies.append(sensor_anomalies)
    
    if anomalies:
        return pd.concat(anomalies, ignore_index=True)
    else:
        return pd.DataFrame()  # No anomalies found

# Streaming I/O manager for time series data
class TimeSeriesIOManager(IOManager):
    """Optimized I/O manager for time series data"""
    
    def __init__(self, base_path: str):
        self.base_path = UPath(base_path)
    
    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        path = self._get_path(context)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        if len(obj) == 0:
            # Handle empty DataFrames
            obj.to_parquet(path, index=False)
            context.add_output_metadata({"rows": 0, "anomalies_detected": False})
        else:
            # Optimize for time series: sort by timestamp, use time-based compression
            obj_sorted = obj.sort_values('timestamp')
            obj_sorted.to_parquet(
                path, 
                index=False,
                compression='snappy',
                write_metadata=True
            )
            
            context.add_output_metadata({
                "rows": len(obj),
                "anomalies_detected": True,
                "time_span_hours": (obj['timestamp'].max() - obj['timestamp'].min()).total_seconds() / 3600,
                "unique_sensors": obj['sensor_id'].nunique() if 'sensor_id' in obj.columns else 0
            })
    
    def load_input(self, context: InputContext) -> pd.DataFrame:
        path = self._get_path(context)
        return pd.read_parquet(path)
    
    def _get_path(self, context) -> UPath:
        # Include partition info in path for time series
        if hasattr(context, 'partition_key') and context.partition_key:
            return self.base_path / f"{context.asset_key.path[-1]}_{context.partition_key}.parquet"
        else:
            return self.base_path / f"{context.asset_key.path[-1]}.parquet"

timeseries_config = Definitions(
    assets=[sensor_data, sensor_anomalies],
    resources={
        "io_manager": TimeSeriesIOManager(base_path="./timeseries_data")
    }
)
```

## Large Data Examples (> 1GB per asset)

### Example 5: Warehouse-Native Processing

```python
from dagster import asset, ConfigurableResource
from typing import Any
import sqlalchemy as sa

class WarehouseResource(ConfigurableResource):
    """Resource for warehouse-native processing"""
    connection_string: str
    
    def execute_sql(self, sql: str) -> str:
        """Execute SQL and return table name/reference"""
        engine = sa.create_engine(self.connection_string)
        with engine.connect() as conn:
            conn.execute(sa.text(sql))
        # Extract table name from CREATE TABLE statement
        table_name = sql.split("CREATE TABLE ")[1].split(" AS")[0].strip()
        return table_name
    
    def get_table_stats(self, table_name: str) -> dict:
        """Get table statistics"""
        engine = sa.create_engine(self.connection_string)
        with engine.connect() as conn:
            # Get row count
            result = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table_name}"))
            row_count = result.scalar()
            
            # Get approximate size (depends on warehouse)
            # This is PostgreSQL syntax - adapt for your warehouse
            size_result = conn.execute(sa.text(f"""
                SELECT pg_size_pretty(pg_total_relation_size('{table_name}'))
            """))
            table_size = size_result.scalar()
            
        return {"row_count": row_count, "table_size": table_size}

@asset(description="Large transaction dataset (100GB)")
def transactions_warehouse(warehouse: WarehouseResource) -> str:
    """Process large transaction dataset entirely in warehouse"""
    
    # Create aggregated transaction table without moving data through Dagster
    sql = """
    CREATE TABLE transactions_daily AS
    SELECT 
        DATE(transaction_timestamp) as transaction_date,
        customer_segment,
        product_category,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) as median_amount
    FROM raw_transactions 
    WHERE transaction_timestamp >= CURRENT_DATE - INTERVAL '1 year'
    GROUP BY 1, 2, 3
    """
    
    table_name = warehouse.execute_sql(sql)
    return table_name  # Return reference, not data

@asset(description="Customer segmentation (processed in warehouse)")
def customer_segments(transactions_warehouse: str, warehouse: WarehouseResource) -> Output[str]:
    """Create customer segments based on transaction patterns"""
    
    sql = f"""
    CREATE TABLE customer_segments AS
    WITH customer_metrics AS (
        SELECT 
            customer_id,
            COUNT(DISTINCT transaction_date) as active_days,
            SUM(total_amount) as lifetime_value,
            AVG(total_amount) as avg_daily_spend,
            MAX(transaction_date) as last_transaction_date,
            MIN(transaction_date) as first_transaction_date
        FROM {transactions_warehouse}
        GROUP BY customer_id
    ),
    segment_assignment AS (
        SELECT 
            *,
            CASE 
                WHEN lifetime_value > 10000 AND active_days > 100 THEN 'VIP'
                WHEN lifetime_value > 5000 AND active_days > 50 THEN 'High Value'
                WHEN lifetime_value > 1000 AND active_days > 20 THEN 'Regular'
                WHEN last_transaction_date > CURRENT_DATE - INTERVAL '30 days' THEN 'New'
                ELSE 'Inactive'
            END as segment
        FROM customer_metrics
    )
    SELECT * FROM segment_assignment
    """
    
    table_name = warehouse.execute_sql(sql)
    
    # Get metadata about the processing
    stats = warehouse.get_table_stats(table_name)
    
    return Output(
        value=table_name,
        metadata={
            "customers_segmented": stats["row_count"],
            "table_size": stats["table_size"],
            "processing_location": "warehouse",
            "data_movement": "none"
        }
    )

# Reference-only I/O manager for warehouse processing
class ReferenceIOManager(IOManager):
    """I/O manager that only stores references to external data"""
    
    def __init__(self, base_path: str = "./references"):
        self.base_path = UPath(base_path)
        self.base_path.mkdir(exist_ok=True)
    
    def handle_output(self, context: OutputContext, obj: str) -> None:
        """Store reference string"""
        path = self._get_path(context)
        path.write_text(obj)
        
        context.add_output_metadata({
            "reference": obj,
            "storage_type": "reference_only",
            "data_location": "external_warehouse"
        })
    
    def load_input(self, context: InputContext) -> str:
        """Load reference string"""
        path = self._get_path(context)
        return path.read_text()
    
    def _get_path(self, context) -> UPath:
        return self.base_path / f"{context.asset_key.path[-1]}.ref"

warehouse_config = Definitions(
    assets=[transactions_warehouse, customer_segments],
    resources={
        "io_manager": ReferenceIOManager(),
        "warehouse": WarehouseResource(
            connection_string="postgresql://user:pass@warehouse:5432/analytics"
        )
    }
)

# Benefits of warehouse-native processing:
# - Zero data movement through Dagster
# - Leverages warehouse's distributed compute
# - Minimal memory/storage requirements for Dagster
# - Dagster provides orchestration and lineage tracking
```

### Example 6: Spark Integration for Big Data

```python
from dagster import asset, ConfigurableResource
from pyspark.sql import SparkSession, DataFrame as SparkDataFrame
from typing import Optional

class SparkResource(ConfigurableResource):
    """Configured Spark resource"""
    app_name: str = "DagsterSparkApp"
    master: str = "local[*]"
    config: dict = {}
    
    def get_spark_session(self) -> SparkSession:
        builder = SparkSession.builder.appName(self.app_name).master(self.master)
        
        # Apply additional configuration
        for key, value in self.config.items():
            builder = builder.config(key, value)
        
        return builder.getOrCreate()

@asset(description="Large dataset processed with Spark")
def large_dataset_spark(spark: SparkResource) -> str:
    """Process multi-TB dataset using Spark"""
    
    spark_session = spark.get_spark_session()
    
    # Read large dataset directly from data lake
    df = spark_session.read.parquet("s3://data-lake/raw/transactions/")
    
    # Perform complex transformations using Spark's distributed compute
    processed_df = (df
        .filter(df.transaction_date >= "2024-01-01")
        .groupBy("customer_id", "product_category")
        .agg({
            "amount": "sum",
            "quantity": "sum",
            "transaction_id": "count"
        })
        .withColumnRenamed("sum(amount)", "total_spent")
        .withColumnRenamed("sum(quantity)", "total_quantity")
        .withColumnRenamed("count(transaction_id)", "transaction_count")
    )
    
    # Write result directly to data lake
    output_path = "s3://data-lake/processed/customer-product-summary/"
    processed_df.write.mode("overwrite").parquet(output_path)
    
    spark_session.stop()
    
    return output_path  # Return path reference

@asset(description="ML feature engineering with Spark")
def ml_features(large_dataset_spark: str, spark: SparkResource) -> Output[str]:
    """Create ML features from large dataset"""
    
    spark_session = spark.get_spark_session()
    
    # Load processed data
    df = spark_session.read.parquet(large_dataset_spark)
    
    # Feature engineering
    from pyspark.sql.functions import col, when, log, sqrt
    
    features_df = (df
        .withColumn("log_total_spent", log(col("total_spent") + 1))
        .withColumn("avg_transaction_amount", col("total_spent") / col("transaction_count"))
        .withColumn("spending_intensity", sqrt(col("total_spent") * col("transaction_count")))
        .withColumn("customer_tier", 
            when(col("total_spent") > 10000, "premium")
            .when(col("total_spent") > 1000, "standard")
            .otherwise("basic")
        )
    )
    
    # Write features for ML pipeline
    features_path = "s3://data-lake/ml/features/customer-features/"
    features_df.write.mode("overwrite").parquet(features_path)
    
    # Collect some metadata for monitoring
    row_count = features_df.count()
    distinct_customers = features_df.select("customer_id").distinct().count()
    
    spark_session.stop()
    
    return Output(
        value=features_path,
        metadata={
            "total_features": row_count,
            "distinct_customers": distinct_customers,
            "feature_columns": len(features_df.columns),
            "processing_engine": "spark",
            "output_format": "parquet"
        }
    )

# Spark configuration optimized for large data
spark_config = Definitions(
    assets=[large_dataset_spark, ml_features],
    resources={
        "io_manager": ReferenceIOManager(),
        "spark": SparkResource(
            app_name="DagsterBigDataProcessing",
            master="spark://spark-master:7077",  # Cluster mode
            config={
                "spark.sql.adaptive.enabled": "true",
                "spark.sql.adaptive.coalescePartitions.enabled": "true",
                "spark.sql.adaptive.skewJoin.enabled": "true",
                "spark.sql.execution.arrow.pyspark.enabled": "true",
                "spark.executor.memory": "8g",
                "spark.executor.cores": "4",
                "spark.executor.instances": "10"
            }
        )
    }
)

# Performance characteristics:
# - Processes 100GB+ datasets
# - Zero data movement through Dagster
# - Distributed compute across Spark cluster
# - Dagster overhead: <1% (orchestration only)
```

## Hybrid Patterns

### Example 7: Mixed Data Sizes with Smart Routing

```python
from dagster import asset, OpExecutionContext
import pandas as pd

class SmartIOManager(IOManager):
    """Automatically choose storage strategy based on data size"""
    
    def __init__(self, small_threshold_mb: int = 100, large_threshold_mb: int = 1000):
        self.small_threshold = small_threshold_mb * 1024 * 1024  # Convert to bytes
        self.large_threshold = large_threshold_mb * 1024 * 1024
        
        # Initialize different storage backends
        self.memory_storage = {}  # For very small data
        self.parquet_manager = ParquetIOManager("./parquet_data")
        self.reference_manager = ReferenceIOManager("./references")
    
    def handle_output(self, context: OutputContext, obj: Any) -> None:
        # Determine size and route to appropriate storage
        if isinstance(obj, pd.DataFrame):
            size_bytes = obj.memory_usage(deep=True).sum()
        elif isinstance(obj, str) and obj.startswith(('s3://', 'gs://', 'abfss://')):
            # This is a reference, use reference manager
            return self.reference_manager.handle_output(context, obj)
        else:
            size_bytes = sys.getsizeof(obj)
        
        context.add_output_metadata({"data_size_bytes": size_bytes})
        
        if size_bytes < self.small_threshold:
            # Store in memory for very small data
            key = self._get_key(context)
            self.memory_storage[key] = obj
            context.add_output_metadata({"storage_type": "memory"})
            
        elif size_bytes < self.large_threshold:
            # Use Parquet for medium data
            self.parquet_manager.handle_output(context, obj)
            context.add_output_metadata({"storage_type": "parquet"})
            
        else:
            # For large data, suggest external processing
            context.log.warning(f"Large object ({size_bytes / 1024 / 1024:.1f}MB) detected. "
                              "Consider using warehouse-native processing for better performance.")
            self.parquet_manager.handle_output(context, obj)
            context.add_output_metadata({"storage_type": "parquet", "size_warning": True})
    
    def load_input(self, context: InputContext) -> Any:
        # Try different storage backends
        key = self._get_key(context)
        
        # Check memory first
        if key in self.memory_storage:
            return self.memory_storage[key]
        
        # Try parquet
        try:
            return self.parquet_manager.load_input(context)
        except FileNotFoundError:
            pass
        
        # Try reference
        try:
            return self.reference_manager.load_input(context)
        except FileNotFoundError:
            pass
        
        raise FileNotFoundError(f"Could not find data for {context.asset_key}")
    
    def _get_key(self, context) -> str:
        return f"{context.asset_key.path[-1]}_{getattr(context, 'partition_key', 'none')}"

@asset(description="Small lookup data")
def product_catalog() -> pd.DataFrame:
    """Small reference data (2MB)"""
    return pd.DataFrame({
        'product_id': range(1000),
        'product_name': [f"Product {i}" for i in range(1000)],
        'category': np.random.choice(['Electronics', 'Clothing', 'Books'], 1000),
        'price': np.random.uniform(10, 1000, 1000)
    })

@asset(description="Medium analytical data")
def sales_analysis() -> pd.DataFrame:
    """Medium-sized analytics (200MB)"""
    n_sales = 5_000_000
    return pd.DataFrame({
        'sale_id': range(n_sales),
        'product_id': np.random.randint(1, 1000, n_sales),
        'customer_id': np.random.randint(1, 100000, n_sales),
        'sale_amount': np.random.uniform(10, 500, n_sales),
        'sale_date': pd.date_range('2024-01-01', periods=n_sales, freq='1min')
    })

@asset(description="Large dataset reference")
def big_data_processing(warehouse: WarehouseResource) -> str:
    """Large dataset processed in warehouse (10GB+)"""
    sql = """
    CREATE TABLE large_aggregation AS
    SELECT 
        customer_id,
        DATE_TRUNC('month', sale_date) as month,
        COUNT(*) as sales_count,
        SUM(sale_amount) as total_sales,
        AVG(sale_amount) as avg_sale_amount
    FROM raw_sales_data
    WHERE sale_date >= '2024-01-01'
    GROUP BY customer_id, DATE_TRUNC('month', sale_date)
    """
    return warehouse.execute_sql(sql)

# Smart routing configuration
hybrid_config = Definitions(
    assets=[product_catalog, sales_analysis, big_data_processing],
    resources={
        "io_manager": SmartIOManager(small_threshold_mb=50, large_threshold_mb=500),
        "warehouse": WarehouseResource(connection_string="...")
    }
)
```

## Performance Monitoring Examples

### Example 8: Comprehensive Performance Tracking

```python
from dagster import asset, sensor, SensorResult, RunRequest, MetadataValue
import time
import psutil
from typing import Dict, List

class PerformanceTracker:
    """Track and analyze asset performance"""
    
    def __init__(self):
        self.metrics = []
    
    def track_asset_performance(self, asset_name: str, execution_time: float, 
                              memory_usage: float, data_size: float) -> None:
        """Record performance metrics"""
        self.metrics.append({
            'asset_name': asset_name,
            'execution_time': execution_time,
            'memory_usage': memory_usage,
            'data_size': data_size,
            'timestamp': time.time(),
            'efficiency_score': data_size / execution_time if execution_time > 0 else 0
        })
    
    def get_performance_summary(self) -> Dict:
        """Generate performance summary"""
        if not self.metrics:
            return {}
        
        df = pd.DataFrame(self.metrics)
        return {
            'total_assets': len(df),
            'avg_execution_time': df['execution_time'].mean(),
            'total_memory_usage': df['memory_usage'].sum(),
            'slowest_asset': df.loc[df['execution_time'].idxmax(), 'asset_name'],
            'most_efficient_asset': df.loc[df['efficiency_score'].idxmax(), 'asset_name']
        }

# Global performance tracker
perf_tracker = PerformanceTracker()

def performance_monitoring_asset(func):
    """Decorator to add performance monitoring to any asset"""
    def wrapper(*args, **kwargs):
        asset_name = func.__name__
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        # Execute asset
        result = func(*args, **kwargs)
        
        # Calculate metrics
        execution_time = time.time() - start_time
        end_memory = psutil.Process().memory_info().rss / 1024 / 1024
        memory_delta = end_memory - start_memory
        
        # Estimate data size
        data_size = 0
        if isinstance(result, pd.DataFrame):
            data_size = result.memory_usage(deep=True).sum() / 1024 / 1024
        
        # Track performance
        perf_tracker.track_asset_performance(asset_name, execution_time, memory_delta, data_size)
        
        return result
    return wrapper

@asset
@performance_monitoring_asset
def monitored_asset_1() -> pd.DataFrame:
    """Asset with automatic performance monitoring"""
    # Simulate processing
    time.sleep(2)  # Simulate work
    return pd.DataFrame(np.random.randn(100000, 10))

@asset
@performance_monitoring_asset
def monitored_asset_2(monitored_asset_1: pd.DataFrame) -> pd.DataFrame:
    """Another monitored asset"""
    # More processing
    time.sleep(1)
    return monitored_asset_1.groupby(monitored_asset_1.columns[0] // 1).mean()

@asset(description="Performance analytics dashboard data")
def performance_dashboard() -> Output[Dict]:
    """Generate performance dashboard data"""
    summary = perf_tracker.get_performance_summary()
    
    return Output(
        value=summary,
        metadata={
            "dashboard_type": "performance_analytics",
            "metrics_collected": len(perf_tracker.metrics),
            "report_timestamp": time.time()
        }
    )

@sensor(asset_selection=[performance_dashboard])
def performance_alert_sensor(context):
    """Alert on performance issues"""
    summary = perf_tracker.get_performance_summary()
    
    if not summary:
        return SensorResult()
    
    # Alert conditions
    alerts = []
    if summary.get('avg_execution_time', 0) > 60:  # > 1 minute average
        alerts.append("High average execution time detected")
    
    if summary.get('total_memory_usage', 0) > 1000:  # > 1GB total memory
        alerts.append("High memory usage detected")
    
    if alerts:
        context.log.warning(f"Performance alerts: {', '.join(alerts)}")
        # In production, send to monitoring system
        
    return SensorResult()
```

## Conclusion

These practical examples demonstrate:

1. **Small Data (< 100MB)**: Use default Dagster I/O managers with minimal overhead
2. **Medium Data (100MB-1GB)**: Implement custom I/O managers for format optimization
3. **Large Data (> 1GB)**: Use reference patterns with warehouse-native processing
4. **Hybrid Approaches**: Smart routing based on data characteristics
5. **Performance Monitoring**: Comprehensive tracking and alerting

Key principles for production use:

- **Start Simple**: Begin with default I/O managers and evolve based on actual performance
- **Measure Everything**: Implement comprehensive performance monitoring
- **Right-Size Storage**: Match I/O manager to data size and access patterns
- **Minimize Data Movement**: Keep large data processing close to storage
- **Monitor and Alert**: Set up automated performance monitoring and alerting

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
