# I/O Manager Implementation Guide

## Overview

This guide provides detailed technical implementation details for Dagster's I/O manager system, based on analysis of the core source code. Understanding these internals helps teams make informed decisions about data storage strategies and custom I/O manager development.

## Core Architecture

### Base Classes and Interfaces

All I/O managers in Dagster implement the abstract `IOManager` base class:

```python
from dagster import IOManager, InputContext, OutputContext
from abc import abstractmethod

class IOManager:
    @abstractmethod
    def load_input(self, context: InputContext) -> Any:
        """Load an input to an asset/op"""
        pass
    
    @abstractmethod
    def handle_output(self, context: OutputContext, obj: Any) -> None:
        """Store an output from an asset/op"""
        pass
```

### Path Computation Logic

Most built-in I/O managers extend `UPathIOManager`, which provides unified path computation:

```python
from dagster._core.storage.upath_io_manager import UPathIOManager
from upath import UPath

class CustomIOManager(UPathIOManager):
    def _get_path(self, context: Union[InputContext, OutputContext]) -> UPath:
        """
        Returns the I/O path for a given context.
        
        For assets: <base_path>/<asset_key_path>
        For ops: <base_path>/storage/<run_id>/files/<step_key>/<output_name>
        """
        if context.has_asset_key:
            # Asset path: direct mapping from asset key
            return self._base_path.joinpath(*context.asset_key.path)
        else:
            # Op output path: includes run context
            return self._base_path.joinpath("storage", *context.get_identifier())
```

## Built-in I/O Manager Analysis

### 1. InMemoryIOManager

**Implementation Details**:
```python
class InMemoryIOManager(IOManager):
    def __init__(self):
        # Simple dictionary storage - no persistence
        self.values: dict[tuple[object, ...], object] = {}

    def handle_output(self, context: OutputContext, obj: object):
        # Key generation from context identifier
        keys = tuple(context.get_identifier())
        self.values[keys] = obj  # Direct object reference

    def load_input(self, context: InputContext) -> object:
        keys = tuple(context.get_identifier())
        return self.values[keys]  # Direct object access
```

**Key Characteristics**:
- Zero serialization overhead
- Memory-only storage (lost after execution)
- Ideal for testing and development
- No network or disk I/O

### 2. PickledObjectFilesystemIOManager

**Implementation Details**:
```python
class PickledObjectFilesystemIOManager(UPathIOManager):
    extension: str = ""  # No extension for compatibility
    
    def dump_to_path(self, context: OutputContext, obj: Any, path: UPath):
        try:
            with path.open("wb") as file:
                pickle.dump(obj, file, PICKLE_PROTOCOL)  # Protocol 4
        except (AttributeError, RecursionError, ImportError, pickle.PicklingError) as e:
            # Comprehensive error handling for unpicklable objects
            raise DagsterInvariantViolationError(f"Object {obj} is not picklable...")

    def load_from_path(self, context: InputContext, path: UPath) -> Any:
        with path.open("rb") as file:
            return pickle.load(file)
```

**Serialization Protocol**:
- Uses Python pickle protocol 4 (efficient for Python 3.4+)
- Handles errors gracefully with detailed messages
- Atomic write operations
- No compression by default

### 3. Cloud I/O Managers (S3, GCS, Azure)

**S3 Implementation Pattern**:
```python
class PickledObjectS3IOManager(UPathIOManager):
    def __init__(self, s3_bucket: str, s3_session: Any, s3_prefix: Optional[str] = None):
        self.bucket = s3_bucket
        self.s3 = s3_session
        # Test connection on initialization
        self.s3.list_objects(Bucket=s3_bucket, Prefix=s3_prefix, MaxKeys=1)
        
    def load_from_path(self, context: InputContext, path: UPath) -> Any:
        try:
            s3_obj = self.s3.get_object(Bucket=self.bucket, Key=path.as_posix())["Body"].read()
            return pickle.loads(s3_obj)  # Deserialize from bytes
        except self.s3.exceptions.NoSuchKey:
            raise FileNotFoundError(f"Could not find file {path} in S3 bucket {self.bucket}")

    def dump_to_path(self, context: OutputContext, obj: Any, path: UPath) -> None:
        pickled_obj = pickle.dumps(obj, PICKLE_PROTOCOL)
        pickled_obj_bytes = io.BytesIO(pickled_obj)
        self.s3.upload_fileobj(pickled_obj_bytes, self.bucket, path.as_posix())
```

**Key Implementation Details**:
- Pickle serialization to bytes before network transfer
- Error handling for missing objects
- Path prefix support for organization
- Connection validation on initialization

## Partitioning Implementation

### Partition Path Construction

The `UPathIOManager` provides sophisticated partitioning support:

```python
def _get_paths_for_partitions(self, context: Union[InputContext, OutputContext]) -> dict[str, UPath]:
    """Returns mapping of partition_keys to I/O paths"""
    
    def _formatted_multipartitioned_path(partition_key: MultiPartitionKey) -> str:
        # Multi-dimension partitions: ordered by dimension name
        ordered_dimension_keys = [
            key[1] for key in sorted(partition_key.keys_by_dimension.items(), key=lambda x: x[0])
        ]
        return "/".join(ordered_dimension_keys)

    formatted_partition_keys = {
        partition_key: (
            _formatted_multipartitioned_path(partition_key)
            if isinstance(partition_key, MultiPartitionKey)
            else partition_key  # Simple partition key as-is
        )
        for partition_key in context.asset_partition_keys
    }

    asset_path = self._get_path_without_extension(context)
    return {
        partition_key: self._with_extension(
            self.get_path_for_partition(context, asset_path, partition)
        )
        for partition_key, partition in formatted_partition_keys.items()
    }
```

**Partition Loading Strategies**:

```python
def load_partitions(self, context: InputContext):
    """
    Flexible partition loading with multiple strategies:
    - Single partition: Direct load
    - Multiple partitions: Dictionary mapping
    - Missing partitions: Configurable error handling
    """
    paths = self._get_paths_for_partitions(context)
    
    if len(context.asset_partition_keys) == 1:
        # Single partition optimization
        partition_key = context.asset_partition_keys[0]
        return self._load_partition_from_path(context, partition_key, paths[partition_key])
    else:
        # Multiple partitions: return dictionary
        objs = {}
        for partition_key in context.asset_partition_keys:
            obj = self._load_partition_from_path(context, partition_key, paths[partition_key])
            if obj is not None:  # Skip missing partitions
                objs[partition_key] = obj
        return objs
```

## Custom I/O Manager Patterns

### Pattern 1: Format-Specific I/O Manager

```python
from dagster import IOManager, OutputContext, InputContext
import pandas as pd
import pyarrow.parquet as pq

class ParquetIOManager(IOManager):
    """High-performance Parquet I/O manager for DataFrames"""
    
    def __init__(self, base_path: str):
        from upath import UPath
        self.base_path = UPath(base_path)
    
    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        path = self._get_path(context)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Parquet with compression
        obj.to_parquet(path, compression='snappy', index=False)
        
        # Log performance metadata
        context.add_output_metadata({
            "rows": len(obj),
            "columns": len(obj.columns),
            "file_size_mb": path.stat().st_size / 1024 / 1024,
            "compression": "snappy"
        })
    
    def load_input(self, context: InputContext) -> pd.DataFrame:
        path = self._get_path(context)
        return pd.read_parquet(path)
    
    def _get_path(self, context) -> "UPath":
        if context.has_asset_key:
            return self.base_path / f"{context.asset_key.path[-1]}.parquet"
        else:
            return self.base_path / "storage" / f"{context.step_key}_{context.name}.parquet"
```

### Pattern 2: Database I/O Manager

```python
import sqlalchemy as sa
from dagster import IOManager, OutputContext, InputContext

class DatabaseIOManager(IOManager):
    """Store DataFrames directly in database tables"""
    
    def __init__(self, connection_string: str):
        self.engine = sa.create_engine(connection_string)
    
    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        table_name = self._get_table_name(context)
        
        # Store DataFrame as database table
        obj.to_sql(
            table_name, 
            self.engine, 
            if_exists='replace',
            index=False,
            method='multi'  # Batch inserts
        )
        
        # Record metadata
        context.add_output_metadata({
            "table_name": table_name,
            "rows_inserted": len(obj),
            "database_size_mb": self._get_table_size(table_name)
        })
    
    def load_input(self, context: InputContext) -> pd.DataFrame:
        table_name = self._get_table_name(context)
        return pd.read_sql_table(table_name, self.engine)
    
    def _get_table_name(self, context) -> str:
        if context.has_asset_key:
            return "_".join(context.asset_key.path)
        else:
            return f"{context.step_key}_{context.name}"
    
    def _get_table_size(self, table_name: str) -> float:
        # Database-specific size query
        with self.engine.connect() as conn:
            result = conn.execute(f"SELECT pg_total_relation_size('{table_name}') / 1024 / 1024")
            return result.scalar()
```

### Pattern 3: Streaming I/O Manager

```python
import json
from typing import Iterator, Any

class StreamingJSONIOManager(IOManager):
    """Handle large datasets with streaming JSON"""
    
    def __init__(self, base_path: str):
        from upath import UPath
        self.base_path = UPath(base_path)
    
    def handle_output(self, context: OutputContext, obj: Iterator[dict]) -> None:
        path = self._get_path(context)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        record_count = 0
        with path.open('w') as f:
            for record in obj:
                f.write(json.dumps(record) + '\n')
                record_count += 1
        
        context.add_output_metadata({
            "records": record_count,
            "format": "jsonl",
            "file_size_mb": path.stat().st_size / 1024 / 1024
        })
    
    def load_input(self, context: InputContext) -> Iterator[dict]:
        path = self._get_path(context)
        with path.open('r') as f:
            for line in f:
                yield json.loads(line.strip())
    
    def _get_path(self, context) -> "UPath":
        if context.has_asset_key:
            return self.base_path / f"{context.asset_key.path[-1]}.jsonl"
        else:
            return self.base_path / "storage" / f"{context.step_key}_{context.name}.jsonl"
```

## Configuration and Resource Integration

### Modern Pythonic Configuration

```python
from dagster import ConfigurableIOManager, InitResourceContext
from pydantic import Field

class ConfigurableParquetIOManager(ConfigurableIOManager):
    """Type-safe configuration with Pydantic"""
    
    base_path: str = Field(description="Base directory for Parquet files")
    compression: str = Field(default="snappy", description="Compression algorithm")
    partition_cols: list[str] = Field(default_factory=list, description="Partition columns")
    
    @classmethod
    def _is_dagster_maintained(cls) -> bool:
        return False  # Custom I/O manager
    
    def create_io_manager(self, context: InitResourceContext) -> ParquetIOManager:
        return ParquetIOManager(
            base_path=self.base_path,
            compression=self.compression,
            partition_cols=self.partition_cols
        )

# Usage in Definitions
from dagster import Definitions

Definitions(
    assets=[my_asset],
    resources={
        "io_manager": ConfigurableParquetIOManager(
            base_path="/data/warehouse",
            compression="gzip",
            partition_cols=["year", "month"]
        )
    }
)
```

### Legacy Resource Configuration

```python
from dagster import io_manager, InitResourceContext

@io_manager(
    config_schema={
        "base_path": str,
        "compression": {"default": "snappy"},
        "max_file_size_mb": {"default": 256}
    },
    required_resource_keys={"database"}
)
def legacy_parquet_io_manager(init_context: InitResourceContext):
    """Legacy-style configuration"""
    config = init_context.resource_config
    database = init_context.resources.database
    
    return ParquetIOManager(
        base_path=config["base_path"],
        compression=config["compression"],
        database=database
    )
```

## Performance Optimization Patterns

### Lazy Loading Implementation

```python
class LazyLoadingIOManager(IOManager):
    """Defer loading until data is actually accessed"""
    
    def handle_output(self, context: OutputContext, obj: Any) -> None:
        # Store metadata about the object
        metadata = {
            "path": self._get_path(context),
            "type": type(obj).__name__,
            "size": sys.getsizeof(obj)
        }
        
        # Actual storage
        self._store_object(obj, metadata["path"])
        
        # Store metadata for lazy loading
        self._store_metadata(context, metadata)
    
    def load_input(self, context: InputContext) -> "LazyProxy":
        # Return proxy object instead of actual data
        metadata = self._load_metadata(context)
        return LazyProxy(metadata["path"], self._load_object)
    
    def _store_object(self, obj: Any, path: str) -> None:
        # Efficient storage implementation
        pass
    
    def _load_object(self, path: str) -> Any:
        # Efficient loading implementation
        pass

class LazyProxy:
    """Proxy object that loads data on first access"""
    
    def __init__(self, path: str, loader_func):
        self._path = path
        self._loader = loader_func
        self._data = None
    
    def __getattr__(self, name):
        if self._data is None:
            self._data = self._loader(self._path)
        return getattr(self._data, name)
```

### Chunked Processing

```python
class ChunkedDataFrameIOManager(IOManager):
    """Handle large DataFrames in chunks"""
    
    def __init__(self, chunk_size: int = 10000):
        self.chunk_size = chunk_size
    
    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        base_path = self._get_path(context)
        
        # Store in chunks
        chunk_count = 0
        for i in range(0, len(obj), self.chunk_size):
            chunk = obj.iloc[i:i + self.chunk_size]
            chunk_path = f"{base_path}.chunk_{chunk_count}.parquet"
            chunk.to_parquet(chunk_path)
            chunk_count += 1
        
        # Store chunk metadata
        metadata = {
            "total_chunks": chunk_count,
            "chunk_size": self.chunk_size,
            "total_rows": len(obj)
        }
        with open(f"{base_path}.metadata.json", 'w') as f:
            json.dump(metadata, f)
    
    def load_input(self, context: InputContext) -> pd.DataFrame:
        base_path = self._get_path(context)
        
        # Load metadata
        with open(f"{base_path}.metadata.json", 'r') as f:
            metadata = json.load(f)
        
        # Load and concatenate chunks
        chunks = []
        for i in range(metadata["total_chunks"]):
            chunk_path = f"{base_path}.chunk_{i}.parquet"
            chunks.append(pd.read_parquet(chunk_path))
        
        return pd.concat(chunks, ignore_index=True)
```

## Error Handling and Resilience

### Comprehensive Error Handling

```python
class RobustIOManager(IOManager):
    """I/O manager with comprehensive error handling"""
    
    def handle_output(self, context: OutputContext, obj: Any) -> None:
        try:
            self._validate_object(obj)
            self._store_with_retry(context, obj)
            self._verify_storage(context, obj)
            
        except ValidationError as e:
            context.log.error(f"Object validation failed: {e}")
            # Store error information for debugging
            self._store_error_info(context, e, obj)
            raise
            
        except StorageError as e:
            context.log.error(f"Storage operation failed: {e}")
            # Attempt cleanup
            self._cleanup_partial_storage(context)
            raise
            
        except Exception as e:
            context.log.error(f"Unexpected error: {e}")
            # Log detailed debugging information
            self._log_debug_info(context, obj, e)
            raise
    
    def load_input(self, context: InputContext) -> Any:
        try:
            return self._load_with_retry(context)
            
        except FileNotFoundError:
            # Provide helpful error message
            available_assets = self._list_available_assets()
            raise DagsterInvariantViolationError(
                f"Asset {context.upstream_output.asset_key} not found. "
                f"Available assets: {available_assets}"
            )
            
        except CorruptedDataError as e:
            # Attempt data recovery
            context.log.warning(f"Data corruption detected: {e}")
            return self._attempt_recovery(context)
    
    def _validate_object(self, obj: Any) -> None:
        """Validate object before storage"""
        if obj is None:
            raise ValidationError("Cannot store None object")
        
        # Check serializability
        try:
            pickle.dumps(obj)
        except Exception as e:
            raise ValidationError(f"Object not serializable: {e}")
    
    def _store_with_retry(self, context: OutputContext, obj: Any, max_retries: int = 3) -> None:
        """Store with exponential backoff retry"""
        for attempt in range(max_retries):
            try:
                self._actual_store(context, obj)
                return
            except TemporaryError as e:
                if attempt == max_retries - 1:
                    raise
                wait_time = 2 ** attempt
                context.log.warning(f"Storage attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
```

## Testing Custom I/O Managers

### Unit Testing Pattern

```python
import tempfile
import pytest
from dagster import build_asset_context

def test_parquet_io_manager():
    """Test custom I/O manager with temporary storage"""
    with tempfile.TemporaryDirectory() as temp_dir:
        io_manager = ParquetIOManager(base_path=temp_dir)
        
        # Create test DataFrame
        test_df = pd.DataFrame({
            'id': [1, 2, 3],
            'value': ['a', 'b', 'c']
        })
        
        # Test output handling
        output_context = build_asset_context(asset_key=["test_asset"])
        io_manager.handle_output(output_context, test_df)
        
        # Test input loading
        input_context = build_asset_context(asset_key=["test_asset"])
        loaded_df = io_manager.load_input(input_context)
        
        # Verify data integrity
        pd.testing.assert_frame_equal(test_df, loaded_df)

def test_io_manager_error_handling():
    """Test error conditions"""
    io_manager = ParquetIOManager(base_path="/invalid/path")
    
    context = build_asset_context(asset_key=["test_asset"])
    
    # Test non-DataFrame object
    with pytest.raises(TypeError):
        io_manager.handle_output(context, "not a dataframe")
    
    # Test missing file
    with pytest.raises(FileNotFoundError):
        io_manager.load_input(context)
```

### Integration Testing

```python
from dagster import asset, materialize, Definitions

def test_io_manager_integration():
    """Test I/O manager with actual assets"""
    
    @asset
    def source_data() -> pd.DataFrame:
        return pd.DataFrame({'x': [1, 2, 3], 'y': [4, 5, 6]})
    
    @asset
    def processed_data(source_data: pd.DataFrame) -> pd.DataFrame:
        return source_data * 2
    
    # Test with custom I/O manager
    with tempfile.TemporaryDirectory() as temp_dir:
        defs = Definitions(
            assets=[source_data, processed_data],
            resources={
                "io_manager": ParquetIOManager(base_path=temp_dir)
            }
        )
        
        result = materialize([source_data, processed_data], resources=defs.resources)
        assert result.success
        
        # Verify files were created
        assert (Path(temp_dir) / "source_data.parquet").exists()
        assert (Path(temp_dir) / "processed_data.parquet").exists()
```

## Conclusion

Understanding Dagster's I/O manager implementation provides the foundation for:

1. **Making Informed Decisions**: Choose the right I/O manager for your data patterns
2. **Custom Development**: Build specialized I/O managers for unique requirements
3. **Performance Optimization**: Implement efficient serialization and storage strategies
4. **Error Handling**: Build robust systems that handle failures gracefully
5. **Testing**: Verify I/O manager behavior with comprehensive test suites

The modular architecture of Dagster's I/O system allows teams to start with defaults and evolve to custom solutions as requirements become more sophisticated.
