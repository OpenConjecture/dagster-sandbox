# Performance Planning Guide for Dagster Asset Materialization

## Overview

This guide provides data teams with concrete methodologies for planning and optimizing the performance of Dagster deployments, with specific focus on asset materialization overhead, data transfer costs, and scaling patterns.

## Performance Planning Framework

### 1. Data Characterization

Before selecting I/O managers and deployment patterns, characterize your data landscape:

```python
# Data inventory template
data_inventory = {
    "small_assets": {
        "count": 150,
        "avg_size_mb": 5,
        "frequency_per_day": 24,
        "retention_days": 30
    },
    "medium_assets": {
        "count": 50,
        "avg_size_mb": 100,
        "frequency_per_day": 4,
        "retention_days": 90
    },
    "large_assets": {
        "count": 10,
        "avg_size_mb": 2000,
        "frequency_per_day": 1,
        "retention_days": 365
    }
}

def calculate_daily_overhead(inventory):
    """Calculate daily data transfer and storage requirements"""
    total_daily_gb = 0
    total_storage_gb = 0
    
    for category, specs in inventory.items():
        daily_data = (specs["count"] * specs["avg_size_mb"] * specs["frequency_per_day"]) / 1024
        retained_data = daily_data * specs["retention_days"]
        
        total_daily_gb += daily_data
        total_storage_gb += retained_data
        
        print(f"{category}: {daily_data:.1f}GB/day, {retained_data:.1f}GB retained")
    
    return total_daily_gb, total_storage_gb

daily_gb, storage_gb = calculate_daily_overhead(data_inventory)
print(f"Total: {daily_gb:.1f}GB/day, {storage_gb:.1f}GB storage")
```

### 2. I/O Manager Selection Matrix

Use this decision matrix to select appropriate I/O managers:

| Asset Size | Frequency | Distribution | Recommended I/O Manager | Expected Overhead |
|------------|-----------|--------------|------------------------|-------------------|
| < 10MB | Any | Single node | `FilesystemIOManager` | Minimal (< 1% CPU) |
| 10-100MB | < 10x/day | Single node | `FilesystemIOManager` | Low (1-5% CPU) |
| 10-100MB | > 10x/day | Single node | Custom Parquet | Medium (5-10% CPU) |
| 10-100MB | Any | Multi-node | `S3PickleIOManager` | Medium (network bound) |
| 100MB-1GB | < 5x/day | Any | `S3PickleIOManager` | High (10-20% overhead) |
| 100MB-1GB | > 5x/day | Any | Custom format-specific | Variable |
| > 1GB | Any | Any | Reference pattern | Minimal (orchestration only) |

### 3. Memory Planning Calculator

```python
import numpy as np
from typing import Dict, List

class MemoryPlanner:
    """Calculate memory requirements for different execution patterns"""
    
    def __init__(self):
        self.pickle_overhead_factor = 2.5  # Peak memory during serialization
        self.loading_overhead_factor = 1.2  # Memory overhead during loading
    
    def calculate_sequential_memory(self, asset_sizes_mb: List[float]) -> Dict[str, float]:
        """Memory requirements for sequential execution"""
        max_asset_mb = max(asset_sizes_mb)
        peak_memory_mb = max_asset_mb * self.pickle_overhead_factor
        
        return {
            "peak_memory_mb": peak_memory_mb,
            "recommended_memory_mb": peak_memory_mb * 1.5,  # 50% buffer
            "max_asset_mb": max_asset_mb
        }
    
    def calculate_parallel_memory(self, asset_sizes_mb: List[float], 
                                max_concurrent: int) -> Dict[str, float]:
        """Memory requirements for parallel execution"""
        # Sort by size to get largest assets that might run together
        sorted_sizes = sorted(asset_sizes_mb, reverse=True)
        concurrent_assets = sorted_sizes[:max_concurrent]
        
        total_memory_mb = sum(size * self.pickle_overhead_factor for size in concurrent_assets)
        
        return {
            "peak_memory_mb": total_memory_mb,
            "recommended_memory_mb": total_memory_mb * 1.5,
            "concurrent_assets": len(concurrent_assets),
            "largest_concurrent_mb": max(concurrent_assets) if concurrent_assets else 0
        }
    
    def recommend_concurrency(self, asset_sizes_mb: List[float], 
                            available_memory_mb: float) -> Dict[str, int]:
        """Recommend optimal concurrency based on available memory"""
        sorted_sizes = sorted(asset_sizes_mb, reverse=True)
        
        # Conservative approach: ensure largest assets can run
        max_safe_asset = available_memory_mb / (self.pickle_overhead_factor * 1.5)
        
        # Calculate how many assets can run concurrently
        concurrent_count = 1
        total_memory = 0
        
        for size in sorted_sizes:
            test_memory = total_memory + (size * self.pickle_overhead_factor)
            if test_memory <= available_memory_mb * 0.8:  # 80% utilization limit
                total_memory = test_memory
                if len(sorted_sizes) > concurrent_count:
                    concurrent_count += 1
            else:
                break
        
        return {
            "recommended_concurrency": max(1, concurrent_count - 1),
            "max_safe_asset_mb": max_safe_asset,
            "memory_utilization_percent": (total_memory / available_memory_mb) * 100
        }

# Example usage
planner = MemoryPlanner()
asset_sizes = [5, 10, 50, 100, 200, 500]  # MB

sequential = planner.calculate_sequential_memory(asset_sizes)
parallel = planner.calculate_parallel_memory(asset_sizes, max_concurrent=3)
recommendations = planner.recommend_concurrency(asset_sizes, available_memory_mb=4096)

print(f"Sequential execution: {sequential}")
print(f"Parallel execution (3 concurrent): {parallel}")
print(f"Recommendations for 4GB RAM: {recommendations}")
```

### 4. Network Bandwidth Planning

```python
class NetworkPlanner:
    """Plan network bandwidth requirements for cloud I/O managers"""
    
    def __init__(self):
        self.cloud_overhead_factor = 1.2  # HTTP/TLS overhead
        self.retry_factor = 1.1  # 10% additional for retries
    
    def calculate_bandwidth_requirements(self, 
                                       daily_upload_gb: float,
                                       daily_download_gb: float,
                                       peak_hours: int = 8) -> Dict[str, float]:
        """Calculate bandwidth requirements"""
        
        # Total daily transfer
        total_daily_gb = (daily_upload_gb + daily_download_gb) * self.cloud_overhead_factor * self.retry_factor
        
        # Peak bandwidth (assume all transfers in peak hours)
        peak_bandwidth_gbps = total_daily_gb / (peak_hours * 3600)
        peak_bandwidth_mbps = peak_bandwidth_gbps * 1024 * 8  # Convert to Mbps
        
        # Average bandwidth
        avg_bandwidth_mbps = peak_bandwidth_mbps * (peak_hours / 24)
        
        return {
            "total_daily_gb": total_daily_gb,
            "peak_bandwidth_mbps": peak_bandwidth_mbps,
            "avg_bandwidth_mbps": avg_bandwidth_mbps,
            "recommended_bandwidth_mbps": peak_bandwidth_mbps * 2  # 100% buffer
        }
    
    def estimate_transfer_costs(self, 
                              monthly_transfer_gb: float,
                              cloud_provider: str = "aws") -> Dict[str, float]:
        """Estimate data transfer costs"""
        
        # Simplified pricing (as of 2024)
        pricing = {
            "aws": {"data_transfer_out": 0.09, "data_transfer_in": 0.0},  # $/GB
            "gcp": {"data_transfer_out": 0.12, "data_transfer_in": 0.0},
            "azure": {"data_transfer_out": 0.087, "data_transfer_in": 0.0}
        }
        
        rates = pricing.get(cloud_provider, pricing["aws"])
        
        # Assume 50% upload, 50% download for simplicity
        upload_gb = monthly_transfer_gb * 0.5
        download_gb = monthly_transfer_gb * 0.5
        
        monthly_cost = (download_gb * rates["data_transfer_out"]) + (upload_gb * rates["data_transfer_in"])
        
        return {
            "monthly_transfer_gb": monthly_transfer_gb,
            "monthly_cost_usd": monthly_cost,
            "annual_cost_usd": monthly_cost * 12,
            "cost_per_gb": monthly_cost / monthly_transfer_gb if monthly_transfer_gb > 0 else 0
        }

# Example usage
network_planner = NetworkPlanner()

# Scenario: 100GB uploads, 50GB downloads per day
bandwidth_req = network_planner.calculate_bandwidth_requirements(
    daily_upload_gb=100,
    daily_download_gb=50,
    peak_hours=6
)

transfer_costs = network_planner.estimate_transfer_costs(
    monthly_transfer_gb=150 * 30,  # 150GB/day * 30 days
    cloud_provider="aws"
)

print(f"Bandwidth requirements: {bandwidth_req}")
print(f"Transfer cost estimates: {transfer_costs}")
```

## Performance Optimization Strategies

### 1. Asset Sizing Optimization

```python
from dagster import asset, Output, MetadataValue
import time
import psutil

def create_performance_monitoring_asset(asset_func):
    """Decorator to add performance monitoring to assets"""
    
    def wrapper(*args, **kwargs):
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Execute original asset function
        result = asset_func(*args, **kwargs)
        
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Calculate performance metrics
        execution_time = end_time - start_time
        memory_delta = end_memory - start_memory
        
        # Get result size if possible
        result_size_mb = 0
        if hasattr(result, '__sizeof__'):
            result_size_mb = result.__sizeof__() / 1024 / 1024
        elif hasattr(result, 'memory_usage') and callable(result.memory_usage):
            result_size_mb = result.memory_usage(deep=True).sum() / 1024 / 1024
        
        # Return with performance metadata
        return Output(
            value=result,
            metadata={
                "execution_time_seconds": execution_time,
                "memory_delta_mb": memory_delta,
                "result_size_mb": result_size_mb,
                "efficiency_mb_per_second": result_size_mb / execution_time if execution_time > 0 else 0
            }
        )
    
    return wrapper

# Usage example
@asset
@create_performance_monitoring_asset
def monitored_data_processing() -> pd.DataFrame:
    # Simulate data processing
    data = pd.DataFrame(np.random.randn(100000, 10))
    return data.groupby(data.columns[0] // 0.1).mean()
```

### 2. Batching and Chunking Strategies

```python
from typing import Iterator, List
import pandas as pd

class BatchProcessor:
    """Process large datasets in manageable batches"""
    
    def __init__(self, batch_size: int = 10000):
        self.batch_size = batch_size
    
    def process_in_batches(self, data_source: str, 
                          processing_func: callable) -> Iterator[pd.DataFrame]:
        """Process data source in batches"""
        
        # Read data in chunks
        chunk_reader = pd.read_csv(data_source, chunksize=self.batch_size)
        
        for batch_num, chunk in enumerate(chunk_reader):
            start_time = time.time()
            
            # Process chunk
            processed_chunk = processing_func(chunk)
            
            processing_time = time.time() - start_time
            
            # Yield with metadata
            yield {
                "data": processed_chunk,
                "batch_number": batch_num,
                "batch_size": len(chunk),
                "processing_time": processing_time
            }

@asset
def large_dataset_processed() -> List[dict]:
    """Process large dataset efficiently"""
    processor = BatchProcessor(batch_size=50000)
    
    def transform_data(df):
        # Your transformation logic
        return df.groupby('category').agg({'value': 'sum', 'count': 'size'})
    
    batches = []
    total_processed = 0
    
    for batch_result in processor.process_in_batches('large_dataset.csv', transform_data):
        batches.append(batch_result)
        total_processed += batch_result["batch_size"]
        
        # Log progress
        print(f"Processed batch {batch_result['batch_number']}: {total_processed} rows")
    
    return batches
```

### 3. Caching and Memoization

```python
from dagster import asset, FreshnessPolicy
import hashlib
import pickle
from pathlib import Path

class SmartCache:
    """Intelligent caching for expensive computations"""
    
    def __init__(self, cache_dir: str = "/tmp/dagster_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
    
    def get_cache_key(self, inputs: dict) -> str:
        """Generate cache key from inputs"""
        # Create stable hash from inputs
        input_str = str(sorted(inputs.items()))
        return hashlib.md5(input_str.encode()).hexdigest()
    
    def get_cached_result(self, cache_key: str):
        """Retrieve cached result if available"""
        cache_file = self.cache_dir / f"{cache_key}.pkl"
        if cache_file.exists():
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
        return None
    
    def cache_result(self, cache_key: str, result):
        """Cache computation result"""
        cache_file = self.cache_dir / f"{cache_key}.pkl"
        with open(cache_file, 'wb') as f:
            pickle.dump(result, f)

cache = SmartCache()

@asset(
    freshness_policy=FreshnessPolicy(maximum_lag_minutes=60)
)
def expensive_computation(input_data: pd.DataFrame) -> pd.DataFrame:
    """Cached expensive computation"""
    
    # Generate cache key from input characteristics
    cache_inputs = {
        "row_count": len(input_data),
        "column_hash": hash(tuple(input_data.columns)),
        "data_hash": hash(tuple(input_data.dtypes))
    }
    
    cache_key = cache.get_cache_key(cache_inputs)
    
    # Check cache first
    cached_result = cache.get_cached_result(cache_key)
    if cached_result is not None:
        print(f"Using cached result for key: {cache_key}")
        return cached_result
    
    # Perform expensive computation
    print(f"Computing result for key: {cache_key}")
    start_time = time.time()
    
    # Your expensive computation here
    result = input_data.apply(lambda x: x ** 2).rolling(window=100).mean()
    
    computation_time = time.time() - start_time
    print(f"Computation took {computation_time:.2f} seconds")
    
    # Cache the result
    cache.cache_result(cache_key, result)
    
    return result
```

## Deployment Pattern Recommendations

### 1. Single-Node Development

```python
# Optimal configuration for development
development_config = {
    "execution": {
        "config": {
            "multiprocess": {
                "max_concurrent": 2  # Prevent resource contention
            }
        }
    },
    "resources": {
        "io_manager": FilesystemIOManager(base_dir="./dev_data"),
        "database": DuckDBResource(database="./dev.db")  # Local development DB
    }
}

# Memory requirements: 2-4GB RAM
# Storage requirements: 1-10GB local disk
# Network requirements: None
```

### 2. Single-Node Production

```python
# Production configuration for smaller deployments
production_single_config = {
    "execution": {
        "config": {
            "multiprocess": {
                "max_concurrent": 4,
                "start_method": "spawn"  # More stable for production
            }
        }
    },
    "resources": {
        "io_manager": FilesystemIOManager(base_dir="/data/dagster"),
        "database": PostgresResource(
            host="localhost",
            database="production",
            username="dagster_user"
        )
    }
}

# Memory requirements: 8-16GB RAM
# Storage requirements: 100GB-1TB SSD
# Network requirements: Minimal
```

### 3. Multi-Node Cloud Deployment

```python
# Cloud deployment with distributed execution
cloud_config = {
    "execution": {
        "config": {
            "k8s": {
                "job_namespace": "dagster",
                "instance_config_map": "dagster-instance",
                "job_image": "my-org/dagster-jobs:latest"
            }
        }
    },
    "resources": {
        "io_manager": S3PickleIOManager(
            s3_bucket="my-org-dagster-data",
            s3_prefix="production"
        ),
        "warehouse": SnowflakeResource(
            account="my-account",
            database="ANALYTICS"
        )
    }
}

# Memory requirements: 4-8GB per pod
# Storage requirements: Minimal local, TB+ cloud storage
# Network requirements: 100+ Mbps sustained
```

### 4. Big Data Warehouse Pattern

```python
# Configuration for warehouse-native processing
warehouse_config = {
    "execution": {
        "config": {
            "in_process": {}  # Sequential execution for orchestration only
        }
    },
    "resources": {
        "io_manager": ReferenceIOManager(),  # Store references only
        "warehouse": BigQueryResource(
            project="my-project",
            location="us-central1"
        ),
        "spark": PySparkResource(
            spark_conf={
                "spark.sql.adaptive.enabled": "true",
                "spark.sql.adaptive.coalescePartitions.enabled": "true"
            }
        )
    }
}

# Memory requirements: 1-2GB for orchestration
# Storage requirements: Minimal local storage
# Network requirements: Low (metadata only)
# Compute requirements: Delegated to warehouse/Spark
```

## Monitoring and Alerting

### 1. Performance Metrics Dashboard

```python
from dagster import asset, DagsterEventLogEntry, RunsFilter
import pandas as pd

@asset
def performance_metrics() -> pd.DataFrame:
    """Generate performance metrics for monitoring"""
    
    # Query event log for materialization events
    # This would typically use the Dagster GraphQL API
    # or database queries in production
    
    metrics = []
    
    # Example metrics collection
    for asset_key in ["asset1", "asset2", "asset3"]:
        # Get recent materialization events
        events = get_materialization_events(asset_key, days=7)
        
        for event in events:
            metrics.append({
                "asset_key": asset_key,
                "timestamp": event.timestamp,
                "execution_time": event.metadata.get("execution_time_seconds", 0),
                "memory_usage": event.metadata.get("memory_delta_mb", 0),
                "result_size": event.metadata.get("result_size_mb", 0),
                "success": event.success
            })
    
    return pd.DataFrame(metrics)

@asset
def performance_alerts(performance_metrics: pd.DataFrame) -> List[dict]:
    """Generate alerts based on performance degradation"""
    
    alerts = []
    
    # Group by asset and calculate statistics
    asset_stats = performance_metrics.groupby('asset_key').agg({
        'execution_time': ['mean', 'std', 'max'],
        'memory_usage': ['mean', 'max'],
        'success': 'mean'
    }).round(2)
    
    for asset_key, stats in asset_stats.iterrows():
        # Alert on execution time increase
        mean_time = stats[('execution_time', 'mean')]
        max_time = stats[('execution_time', 'max')]
        std_time = stats[('execution_time', 'std')]
        
        if max_time > mean_time + 3 * std_time:
            alerts.append({
                "type": "performance_degradation",
                "asset": asset_key,
                "message": f"Execution time spike: {max_time:.1f}s (avg: {mean_time:.1f}s)",
                "severity": "warning"
            })
        
        # Alert on success rate
        success_rate = stats[('success', 'mean')]
        if success_rate < 0.95:
            alerts.append({
                "type": "reliability_issue",
                "asset": asset_key,
                "message": f"Success rate dropped to {success_rate:.1%}",
                "severity": "critical"
            })
    
    return alerts
```

### 2. Resource Utilization Monitoring

```python
import psutil
from dagster import sensor, SensorResult, RunRequest

@sensor(job_name="cleanup_job")
def resource_monitor_sensor(context):
    """Monitor system resources and trigger cleanup when needed"""
    
    # Get current resource usage
    memory_percent = psutil.virtual_memory().percent
    disk_percent = psutil.disk_usage('/').percent
    
    # Log current usage
    context.log.info(f"Memory usage: {memory_percent:.1f}%")
    context.log.info(f"Disk usage: {disk_percent:.1f}%")
    
    # Trigger cleanup if resources are high
    if memory_percent > 85 or disk_percent > 90:
        return SensorResult(
            run_requests=[
                RunRequest(
                    run_config={
                        "resources": {
                            "cleanup_config": {
                                "memory_threshold": memory_percent,
                                "disk_threshold": disk_percent
                            }
                        }
                    }
                )
            ]
        )
    
    return SensorResult()
```

## Cost Optimization

### 1. Storage Cost Analysis

```python
class StorageCostAnalyzer:
    """Analyze and optimize storage costs"""
    
    def __init__(self):
        # Cloud storage pricing (simplified, per GB/month)
        self.storage_costs = {
            "s3_standard": 0.023,
            "s3_ia": 0.0125,  # Infrequent Access
            "s3_glacier": 0.004,
            "gcs_standard": 0.020,
            "gcs_nearline": 0.010,
            "azure_hot": 0.0184,
            "azure_cool": 0.01
        }
    
    def analyze_asset_access_patterns(self, asset_metrics: pd.DataFrame) -> pd.DataFrame:
        """Analyze how frequently assets are accessed"""
        
        # Calculate access frequency
        access_analysis = asset_metrics.groupby('asset_key').agg({
            'timestamp': ['count', 'min', 'max'],
            'result_size': 'mean'
        }).round(3)
        
        access_analysis.columns = ['access_count', 'first_access', 'last_access', 'avg_size_mb']
        
        # Calculate days since creation and access frequency
        access_analysis['days_since_creation'] = (
            pd.Timestamp.now() - access_analysis['first_access']
        ).dt.days
        
        access_analysis['accesses_per_day'] = (
            access_analysis['access_count'] / access_analysis['days_since_creation']
        ).fillna(0)
        
        # Categorize by access pattern
        def categorize_access(row):
            if row['accesses_per_day'] > 1:
                return 'hot'
            elif row['accesses_per_day'] > 0.1:
                return 'warm'
            else:
                return 'cold'
        
        access_analysis['access_category'] = access_analysis.apply(categorize_access, axis=1)
        
        return access_analysis
    
    def recommend_storage_tiers(self, access_analysis: pd.DataFrame) -> pd.DataFrame:
        """Recommend optimal storage tiers"""
        
        recommendations = access_analysis.copy()
        
        # Recommend storage tier based on access pattern
        tier_mapping = {
            'hot': 's3_standard',
            'warm': 's3_ia',
            'cold': 's3_glacier'
        }
        
        recommendations['recommended_tier'] = recommendations['access_category'].map(tier_mapping)
        
        # Calculate potential savings
        current_cost = recommendations['avg_size_mb'] * self.storage_costs['s3_standard'] / 1024
        
        recommended_costs = []
        for _, row in recommendations.iterrows():
            tier_cost = self.storage_costs[row['recommended_tier']]
            cost = row['avg_size_mb'] * tier_cost / 1024
            recommended_costs.append(cost)
        
        recommendations['current_monthly_cost'] = current_cost
        recommendations['recommended_monthly_cost'] = recommended_costs
        recommendations['monthly_savings'] = current_cost - recommended_costs
        
        return recommendations

# Usage example
analyzer = StorageCostAnalyzer()
# access_analysis = analyzer.analyze_asset_access_patterns(performance_metrics)
# recommendations = analyzer.recommend_storage_tiers(access_analysis)
```

### 2. Compute Cost Optimization

```python
@asset
def cost_optimized_processing(large_dataset_ref: str) -> str:
    """Example of cost-optimized processing pattern"""
    
    # Use spot instances or preemptible VMs for long-running jobs
    # Process data where it lives (in warehouse) rather than moving it
    
    processing_config = {
        "use_spot_instances": True,
        "max_spot_price": 0.10,  # 10 cents per hour
        "fallback_to_on_demand": True,
        "processing_location": "warehouse_native"  # Process in BigQuery/Snowflake
    }
    
    # Submit job to warehouse for processing
    sql_query = f"""
    CREATE TABLE processed_data AS
    SELECT 
        customer_id,
        SUM(order_value) as total_value,
        COUNT(*) as order_count,
        AVG(order_value) as avg_order_value
    FROM {large_dataset_ref}
    WHERE order_date >= CURRENT_DATE - 90
    GROUP BY customer_id
    """
    
    # Execute in warehouse (BigQuery, Snowflake, etc.)
    # This processes TBs of data without moving it through Dagster
    result_table = execute_warehouse_query(sql_query, config=processing_config)
    
    return result_table  # Return reference, not data
```

## Conclusion

Effective performance planning for Dagster asset materialization requires:

1. **Data Characterization**: Understand your data sizes, frequencies, and access patterns
2. **Resource Planning**: Calculate memory, storage, and network requirements
3. **I/O Manager Selection**: Choose appropriate storage backends for different data patterns
4. **Monitoring**: Implement comprehensive performance and cost monitoring
5. **Optimization**: Continuously optimize based on actual usage patterns

The key is to start with simple configurations and evolve based on measured performance and costs. The modular nature of Dagster's I/O system allows for gradual optimization without major architectural changes.
