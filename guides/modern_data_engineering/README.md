# Comprehensive Dagster Training Guide for Modern Data Engineering

## Table of Contents
1. [Introduction & Overview](#introduction--overview)
2. [Audience & Learning Objectives](#audience--learning-objectives)
3. [Curriculum Structure](#curriculum-structure)
4. [Level 1: Beginner Track](#level-1-beginner-track)
5. [Level 2: Intermediate Track](#level-2-intermediate-track)
6. [Level 3: Advanced Track](#level-3-advanced-track)
7. [Best Practices & Patterns](#best-practices--patterns)
8. [Assessment & Certification](#assessment--certification)
9. [Resources & Next Steps](#resources--next-steps)

---

## Introduction & Overview

Dagster is a modern data orchestration platform designed for the entire development lifecycle of data applications. This comprehensive training guide provides a structured learning path for mastering Dagster in the context of modern data engineering practices.

### Why Dagster?
- **Asset-centric approach**: Focus on the data assets you produce, not just the tasks
- **Software-defined assets**: Declarative, testable, and maintainable pipelines
- **Built-in observability**: Rich metadata, lineage tracking, and monitoring
- **Development-to-production workflow**: Local testing to production deployment

---

## Audience & Learning Objectives

### Target Personas

#### 1. **Data Analyst / Analytics Engineer**
- **Background**: SQL proficiency, basic Python, familiar with BI tools
- **Learning Objectives**:
  - Build and schedule simple data pipelines
  - Create data quality checks and alerts
  - Understand asset dependencies and lineage
  - Integrate with common data warehouses (Snowflake, BigQuery)

#### 2. **ETL/Data Engineer**
- **Background**: Strong Python, experience with traditional ETL tools (Airflow, Luigi)
- **Learning Objectives**:
  - Design and implement complex asset graphs
  - Migrate existing pipelines to Dagster
  - Implement error handling and retry logic
  - Build reusable components and libraries
  - Optimize pipeline performance

#### 3. **Data Platform Architect**
- **Background**: System design, infrastructure, DevOps practices
- **Learning Objectives**:
  - Design scalable Dagster deployments
  - Implement CI/CD for data pipelines
  - Build custom executors and resources
  - Establish data governance patterns
  - Create monitoring and alerting strategies

---

## Curriculum Structure

### Learning Path Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   BEGINNER      │ --> │  INTERMEDIATE    │ --> │    ADVANCED     │
│   (40 hours)    │     │   (60 hours)     │     │   (80 hours)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Prerequisites by Level

| Level | Prerequisites |
|-------|--------------|
| Beginner | Python basics, SQL fundamentals, Git basics |
| Intermediate | Beginner completion, OOP concepts, Docker basics |
| Advanced | Intermediate completion, Cloud platforms, Kubernetes concepts |

---

## Level 1: Beginner Track

### Module 1.1: Dagster Fundamentals (8 hours)

#### Overview
Introduction to Dagster's core concepts and architecture.

#### Learning Objectives
- Understand Dagster's philosophy and architecture
- Set up local development environment
- Create your first pipeline
- Navigate the Dagit UI

#### Content Outline

##### Theory (2 hours)
- What is Dagster and why use it?
- Core concepts: Assets, Ops, Jobs, Resources
- Dagster vs traditional orchestrators
- Architecture overview

##### Hands-on Lab (4 hours)

**Lab 1.1.1: Environment Setup**
```bash
# Create virtual environment
python -m venv dagster-env
source dagster-env/bin/activate  # On Windows: dagster-env\Scripts\activate

# Install Dagster
pip install dagster dagit

# Create project structure
dagster project scaffold --name my_first_pipeline
cd my_first_pipeline
```

**Lab 1.1.2: First Asset**
```python
# my_first_pipeline/assets/__init__.py
from dagster import asset
import pandas as pd

@asset
def raw_customers():
    """Load raw customer data"""
    return pd.DataFrame({
        'customer_id': [1, 2, 3, 4, 5],
        'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
        'signup_date': pd.date_range('2024-01-01', periods=5)
    })

@asset
def customer_metrics(raw_customers):
    """Calculate basic customer metrics"""
    metrics = raw_customers.copy()
    metrics['days_since_signup'] = (pd.Timestamp.now() - metrics['signup_date']).dt.days
    return metrics
```

**Lab 1.1.3: Running Pipelines**
```bash
# Launch Dagit
dagit -f my_first_pipeline/definitions.py

# Navigate to http://localhost:3000
# Materialize assets through UI
```

##### Review Questions (2 hours)
1. What is the difference between an Op and an Asset?
2. How does Dagster track data lineage?
3. What are the benefits of software-defined assets?

### Module 1.2: Working with Assets (10 hours)

#### Overview
Deep dive into Dagster's asset-centric approach.

#### Content Outline

##### Theory (2 hours)
- Asset materialization
- Asset dependencies
- Asset groups and prefixes
- Metadata and descriptions

##### Hands-on Lab (6 hours)

**Lab 1.2.1: Asset Dependencies**
```python
from dagster import asset, AssetIn, Output, MetadataValue
import pandas as pd
import matplotlib.pyplot as plt

@asset(
    description="Raw sales data from CSV",
    metadata={"source": "sales_system"}
)
def raw_sales():
    """Load raw sales data"""
    # In practice, load from file/database
    return pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=30),
        'product_id': [1, 2, 3] * 10,
        'quantity': range(30, 60),
        'revenue': [x * 10.5 for x in range(30, 60)]
    })

@asset(
    ins={"raw_sales": AssetIn()},
    description="Aggregated daily sales metrics"
)
def daily_sales_summary(raw_sales):
    """Calculate daily sales summary"""
    summary = raw_sales.groupby('date').agg({
        'quantity': 'sum',
        'revenue': 'sum'
    }).reset_index()
    
    return Output(
        value=summary,
        metadata={
            "num_rows": len(summary),
            "total_revenue": float(summary['revenue'].sum()),
            "preview": MetadataValue.md(summary.head().to_markdown())
        }
    )

@asset(
    ins={"daily_sales_summary": AssetIn()},
    description="Sales trend visualization"
)
def sales_trend_chart(daily_sales_summary):
    """Create sales trend chart"""
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(daily_sales_summary['date'], daily_sales_summary['revenue'])
    ax.set_title('Daily Revenue Trend')
    ax.set_xlabel('Date')
    ax.set_ylabel('Revenue ($)')
    
    # Save chart
    chart_path = "sales_trend.png"
    plt.savefig(chart_path)
    plt.close()
    
    return Output(
        value=chart_path,
        metadata={
            "chart_type": "line_plot",
            "path": MetadataValue.path(chart_path)
        }
    )
```

**Lab 1.2.2: Asset Groups**
```python
from dagster import asset, AssetGroup, repository

# Customer domain assets
@asset(group_name="customers", compute_kind="pandas")
def customer_base():
    pass

@asset(group_name="customers", compute_kind="pandas")
def customer_segments(customer_base):
    pass

# Product domain assets
@asset(group_name="products", compute_kind="sql")
def product_catalog():
    pass

@asset(group_name="products", compute_kind="python")
def product_recommendations(product_catalog, customer_segments):
    pass
```

##### Mini-Project (2 hours)
Build a simple ETL pipeline that:
1. Loads data from CSV files
2. Performs data quality checks
3. Transforms and aggregates data
4. Outputs results to files

### Module 1.3: Resources and IO Managers (8 hours)

#### Overview
Managing external dependencies and data persistence.

#### Content Outline

##### Theory (2 hours)
- Resources concept and lifecycle
- IO Managers for data persistence
- Configuration and environment management

##### Hands-on Lab (4 hours)

**Lab 1.3.1: Custom Resources**
```python
from dagster import resource, asset, Definitions
import psycopg2
from contextlib import contextmanager

@resource(
    config_schema={
        "host": str,
        "port": int,
        "database": str,
        "user": str,
        "password": str
    }
)
@contextmanager
def postgres_connection(context):
    """Postgres database connection resource"""
    config = context.resource_config
    conn = psycopg2.connect(
        host=config["host"],
        port=config["port"],
        database=config["database"],
        user=config["user"],
        password=config["password"]
    )
    try:
        yield conn
    finally:
        conn.close()

@asset(required_resource_keys={"database"})
def customers_from_db(context):
    """Load customers from database"""
    with context.resources.database as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers")
        return cursor.fetchall()

# Define resources
defs = Definitions(
    assets=[customers_from_db],
    resources={
        "database": postgres_connection.configured({
            "host": "localhost",
            "port": 5432,
            "database": "analytics",
            "user": "dagster",
            "password": {"env": "DB_PASSWORD"}  # From environment variable
        })
    }
)
```

**Lab 1.3.2: IO Managers**
```python
from dagster import IOManager, io_manager, asset
import pandas as pd
import os

class ParquetIOManager(IOManager):
    def __init__(self, base_dir):
        self.base_dir = base_dir

    def handle_output(self, context, obj):
        """Save DataFrame as Parquet"""
        if isinstance(obj, pd.DataFrame):
            path = os.path.join(
                self.base_dir,
                f"{context.asset_key.path[-1]}.parquet"
            )

**Lab 3.6.2: Machine Learning Pipeline**
```python
from dagster import asset, op, job, AssetsDefinition
import mlflow
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib

# ML Pipeline Assets
@asset(
    metadata={
        "model_type": "RandomForestClassifier",
        "framework": "scikit-learn"
    }
)
def feature_engineered_data(raw_data: pd.DataFrame) -> pd.DataFrame:
    """Create features for ML model"""
    
    features = raw_data.copy()
    
    # Feature engineering
    features['day_of_week'] = pd.to_datetime(features['date']).dt.dayofweek
    features['month'] = pd.to_datetime(features['date']).dt.month
    features['quarter'] = pd.to_datetime(features['date']).dt.quarter
    
    # Lag features
    for lag in [1, 7, 30]:
        features[f'revenue_lag_{lag}'] = features['revenue'].shift(lag)
    
    # Rolling statistics
    for window in [7, 30]:
        features[f'revenue_rolling_mean_{window}'] = (
            features['revenue'].rolling(window).mean()
        )
        features[f'revenue_rolling_std_{window}'] = (
            features['revenue'].rolling(window).std()
        )
    
    # Drop NaN rows from feature engineering
    features = features.dropna()
    
    return features

@asset
def ml_training_data(feature_engineered_data: pd.DataFrame) -> Dict:
    """Prepare data for model training"""
    
    # Define features and target
    feature_cols = [col for col in feature_engineered_data.columns 
                   if col not in ['date', 'revenue', 'target']]
    
    X = feature_engineered_data[feature_cols]
    y = feature_engineered_data['target']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    return {
        'X_train': X_train,
        'X_test': X_test,
        'y_train': y_train,
        'y_test': y_test,
        'feature_names': feature_cols
    }

@asset(
    metadata={"mlflow.experiment": "revenue_prediction"}
)
def trained_model(context, ml_training_data: Dict) -> Dict:
    """Train ML model with experiment tracking"""
    
    # Start MLflow run
    with mlflow.start_run():
        # Log parameters
        params = {
            'n_estimators': 100,
            'max_depth': 10,
            'min_samples_split': 5,
            'random_state': 42
        }
        mlflow.log_params(params)
        
        # Train model
        model = RandomForestClassifier(**params)
        model.fit(
            ml_training_data['X_train'],
            ml_training_data['y_train']
        )
        
        # Evaluate
        train_score = model.score(
            ml_training_data['X_train'],
            ml_training_data['y_train']
        )
        test_score = model.score(
            ml_training_data['X_test'],
            ml_training_data['y_test']
        )
        
        # Log metrics
        mlflow.log_metric('train_accuracy', train_score)
        mlflow.log_metric('test_accuracy', test_score)
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': ml_training_data['feature_names'],
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        # Log model
        mlflow.sklearn.log_model(model, "model")
        
        # Save model artifact
        model_path = f"/models/revenue_model_{context.run_id}.pkl"
        joblib.dump(model, model_path)
        
        context.log.info(f"Model trained - Test accuracy: {test_score:.3f}")
        
        return {
            'model': model,
            'model_path': model_path,
            'train_score': train_score,
            'test_score': test_score,
            'feature_importance': feature_importance,
            'run_id': mlflow.active_run().info.run_id
        }

@asset
def model_predictions(context, trained_model: Dict, inference_data: pd.DataFrame) -> pd.DataFrame:
    """Generate predictions using trained model"""
    
    model = trained_model['model']
    
    # Prepare features
    feature_cols = trained_model['feature_importance']['feature'].tolist()
    X = inference_data[feature_cols]
    
    # Generate predictions
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)
    
    # Create results DataFrame
    results = inference_data.copy()
    results['prediction'] = predictions
    results['probability'] = probabilities.max(axis=1)
    
    # Add metadata
    context.add_output_metadata({
        'num_predictions': len(results),
        'prediction_distribution': results['prediction'].value_counts().to_dict(),
        'avg_confidence': float(results['probability'].mean())
    })
    
    return results

# Model monitoring and retraining
@op
def check_model_drift(context, current_metrics: Dict, baseline_metrics: Dict) -> bool:
    """Check if model needs retraining due to drift"""
    
    accuracy_drop = baseline_metrics['accuracy'] - current_metrics['accuracy']
    
    if accuracy_drop > 0.05:  # 5% accuracy drop
        context.log.warning(f"Model drift detected: {accuracy_drop:.2%} accuracy drop")
        return True
    
    # Check feature distribution drift
    for feature, stats in current_metrics['feature_stats'].items():
        baseline_stats = baseline_metrics['feature_stats'].get(feature, {})
        
        mean_shift = abs(stats['mean'] - baseline_stats.get('mean', 0))
        std_shift = abs(stats['std'] - baseline_stats.get('std', 1))
        
        if mean_shift > 2 * baseline_stats.get('std', 1):
            context.log.warning(f"Feature drift in {feature}: mean shift = {mean_shift}")
            return True
    
    return False

@job
def ml_retraining_pipeline():
    """Automated retraining pipeline"""
    
    @op
    def evaluate_current_model(context, model_path: str, eval_data: pd.DataFrame) -> Dict:
        model = joblib.load(model_path)
        # Evaluation logic
        return metrics
    
    current_metrics = evaluate_current_model()
    needs_retraining = check_model_drift(current_metrics)
    
    # Conditional retraining
    @op(
        skip_on=lambda context: not context.op_config['retrain']
    )
    def retrain_model(context):
        # Retraining logic
        pass
```

**Lab 3.6.3: Event-Driven ML Pipeline**
```python
from dagster import sensor, asset_sensor, freshness_policy
import torch
import numpy as np

# Real-time feature store integration
class FeatureStore:
    """Real-time feature store for ML"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def get_features(self, entity_id: str, feature_names: List[str]) -> Dict:
        """Retrieve features from store"""
        features = {}
        for feature in feature_names:
            key = f"feature:{entity_id}:{feature}"
            value = self.redis.get(key)
            if value:
                features[feature] = float(value)
        return features
    
    def update_feature(self, entity_id: str, feature_name: str, value: float):
        """Update feature in real-time"""
        key = f"feature:{entity_id}:{feature_name}"
        self.redis.setex(key, 3600, value)  # 1 hour TTL

@asset(
    freshness_policy=FreshnessPolicy(maximum_lag_minutes=5),
    metadata={"compute_kind": "streaming"}
)
def real_time_features(context, event_stream: Iterator[Dict]) -> None:
    """Compute features in real-time from event stream"""
    
    feature_store = context.resources.feature_store
    
    for event in event_stream:
        entity_id = event['entity_id']
        
        # Compute real-time features
        features = {
            'event_count_1h': compute_event_count(entity_id, window='1h'),
            'avg_value_1h': compute_avg_value(entity_id, window='1h'),
            'trend_score': compute_trend(entity_id)
        }
        
        # Update feature store
        for feature_name, value in features.items():
            feature_store.update_feature(entity_id, feature_name, value)
        
        # Log feature updates
        context.log_event(
            AssetObservation(
                asset_key="real_time_features",
                metadata={
                    "entity_id": entity_id,
                    "features_updated": len(features),
                    "timestamp": pd.Timestamp.now().isoformat()
                }
            )
        )

# Neural network model with Dagster
@asset
def deep_learning_model(context, training_data: pd.DataFrame) -> Dict:
    """Train deep learning model with PyTorch"""
    
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    
    class RevenuePredictor(nn.Module):
        def __init__(self, input_dim):
            super().__init__()
            self.layers = nn.Sequential(
                nn.Linear(input_dim, 128),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.Linear(32, 1)
            )
        
        def forward(self, x):
            return self.layers(x)
    
    # Prepare data
    X = training_data.drop(['target'], axis=1).values
    y = training_data['target'].values
    
    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.FloatTensor(y).reshape(-1, 1)
    
    dataset = TensorDataset(X_tensor, y_tensor)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    # Initialize model
    model = RevenuePredictor(X.shape[1])
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # Training loop
    epochs = 100
    for epoch in range(epochs):
        total_loss = 0
        for batch_X, batch_y in dataloader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        if epoch % 10 == 0:
            context.log.info(f"Epoch {epoch}, Loss: {total_loss/len(dataloader):.4f}")
    
    # Save model
    model_path = f"/models/deep_model_{context.run_id}.pt"
    torch.save(model.state_dict(), model_path)
    
    return {
        'model_path': model_path,
        'architecture': str(model),
        'final_loss': total_loss / len(dataloader)
    }
```

##### Project (2 hours)
Implement an end-to-end ML pipeline that:
1. Streams data from Kafka
2. Computes real-time features
3. Trains models with drift detection
4. Serves predictions via API

---

## Best Practices & Patterns

### Development Best Practices

#### 1. Code Organization
```python
# project_structure/
dagster_project/
├── assets/
│   ├── __init__.py
│   ├── bronze/         # Raw data assets
│   ├── silver/         # Cleaned data assets
│   └── gold/           # Business-ready assets
├── ops/
│   ├── __init__.py
│   └── transformations.py
├── resources/
│   ├── __init__.py
│   └── connections.py
├── jobs/
│   ├── __init__.py
│   └── pipelines.py
├── schedules/
│   └── __init__.py
├── sensors/
│   └── __init__.py
├── utils/
│   └── __init__.py
└── tests/
    ├── unit/
    └── integration/
```

#### 2. Naming Conventions
```python
# Assets: noun_descriptor
@asset
def customer_demographics(): ...

# Ops: verb_noun
@op
def validate_customer_data(): ...

# Jobs: domain_action_pipeline
@job
def analytics_daily_refresh_pipeline(): ...

# Resources: system_connection
@resource
def snowflake_connection(): ...
```

#### 3. Configuration Management
```python
from dagster import Config
from pydantic import Field

class DatabaseConfig(Config):
    host: str = Field(description="Database host")
    port: int = Field(default=5432, description="Database port")
    database: str = Field(description="Database name")
    user: str = Field(description="Username")
    password: str = Field(description="Password")

@asset
def configured_asset(config: DatabaseConfig):
    # Use strongly typed config
    conn_string = f"postgresql://{config.user}:{config.password}@{config.host}:{config.port}/{config.database}"
```

### Testing Best Practices

#### 1. Test Structure
```python
# tests/unit/test_assets.py
import pytest
from dagster import build_asset_context, materialize_to_memory
from my_project.assets import customer_metrics

def test_customer_metrics_calculation():
    # Arrange
    test_data = pd.DataFrame({
        'customer_id': [1, 2, 3],
        'purchase_amount': [100, 200, 150]
    })
    
    # Act
    context = build_asset_context()
    result = customer_metrics(context, test_data)
    
    # Assert
    assert len(result) == 3
    assert result['total_spent'].sum() == 450

# tests/integration/test_pipeline.py
def test_full_pipeline_execution():
    # Test entire job execution
    result = materialize(
        [raw_data, processed_data, final_report],
        resources={"io_manager": test_io_manager}
    )
    assert result.success
```

#### 2. Testing Patterns
```python
# Mocking external dependencies
@patch('requests.get')
def test_api_asset(mock_get):
    mock_get.return_value.json.return_value = {'data': 'test'}
    
    result = api_data_asset(build_asset_context())
    assert result == {'data': 'test'}

# Testing with fixtures
@pytest.fixture
def sample_dataframe():
    return pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=5),
        'value': [10, 20, 30, 40, 50]
    })

def test_aggregation(sample_dataframe):
    result = aggregate_by_date(sample_dataframe)
    assert len(result) == 5
```

### Production Best Practices

#### 1. Error Handling
```python
from dagster import Failure, RetryPolicy, ExpectationResult

@asset(
    retry_policy=RetryPolicy(
        max_retries=3,
        delay=5,
        backoff=Backoff.EXPONENTIAL
    )
)
def robust_asset(context):
    try:
        # Main logic
        data = fetch_data()
        
        # Data quality checks
        if data.empty:
            raise Failure(
                description="No data returned from source",
                metadata={"timestamp": pd.Timestamp.now().isoformat()}
            )
        
        # Return with expectations
        return Output(
            value=data,
            metadata={"row_count": len(data)},
            expectation_results=[
                ExpectationResult(
                    success=len(data) > 0,
                    label="has_data",
                    description="Dataset should not be empty"
                )
            ]
        )
    
    except Exception as e:
        context.log.error(f"Asset failed: {str(e)}")
        raise Failure(
            description=f"Asset computation failed: {str(e)}",
            metadata={
                "error_type": type(e).__name__,
                "error_message": str(e),
                "timestamp": pd.Timestamp.now().isoformat()
            }
        )
```

#### 2. Monitoring and Alerting
```python
from dagster import run_failure_sensor, RunFailureSensorContext
import requests

@run_failure_sensor
def pipeline_failure_alert(context: RunFailureSensorContext):
    """Send alerts on pipeline failures"""
    
    run = context.dagster_run
    
    # Send Slack notification
    slack_message = {
        "text": f"Pipeline Failed: {run.job_name}",
        "attachments": [{
            "color": "danger",
            "fields": [
                {"title": "Job", "value": run.job_name, "short": True},
                {"title": "Run ID", "value": run.run_id, "short": True},
                {"title": "Failure Time", "value": pd.Timestamp.now().isoformat()},
                {"title": "Error", "value": context.failure_event.message}
            ]
        }]
    }
    
    requests.post(
        os.environ["SLACK_WEBHOOK_URL"],
        json=slack_message
    )
    
    # Log to monitoring system
    context.log.info("Failure alert sent")
```

#### 3. Performance Optimization
```python
# Parallel processing
@op(
    config_schema={"parallelism": Field(int, default_value=4)}
)
def parallel_processing_op(context, data_chunks: List[pd.DataFrame]):
    """Process data chunks in parallel"""
    
    from concurrent.futures import ProcessPoolExecutor
    
    with ProcessPoolExecutor(max_workers=context.op_config["parallelism"]) as executor:
        results = list(executor.map(process_chunk, data_chunks))
    
    return pd.concat(results)

# Incremental processing
@asset(
    partitions_def=DailyPartitionsDefinition(start_date="2024-01-01")
)
def incremental_data(context) -> pd.DataFrame:
    """Process only new data"""
    
    partition_date = context.partition_key
    
    # Query only for specific partition
    query = f"""
    SELECT * FROM source_table
    WHERE date = '{partition_date}'
    AND processed = FALSE
    """
    
    data = pd.read_sql(query, context.resources.database)
    
    # Mark as processed
    update_query = f"""
    UPDATE source_table
    SET processed = TRUE
    WHERE date = '{partition_date}'
    """
    
    return data
```

---

## Assessment & Certification

### Knowledge Assessment

#### Beginner Level Assessment
1. **Conceptual Understanding** (30%)
   - Define assets vs ops
   - Explain DAG concepts
   - Describe resource lifecycle

2. **Practical Implementation** (40%)
   - Create basic assets
   - Implement simple transformations
   - Use IO managers

3. **Problem Solving** (30%)
   - Debug failing pipelines
   - Optimize simple workflows
   - Handle basic errors

#### Intermediate Level Assessment
1. **Advanced Concepts** (30%)
   - Design complex asset graphs
   - Implement custom resources
   - Create reusable components

2. **Production Practices** (40%)
   - Write comprehensive tests
   - Implement monitoring
   - Design for scale

3. **Integration Skills** (30%)
   - Connect to external systems
   - Implement sensors
   - Build dynamic pipelines

#### Advanced Level Assessment
1. **Architecture Design** (40%)
   - Design enterprise solutions
   - Implement custom executors
   - Build frameworks

2. **Performance & Scale** (30%)
   - Optimize for large datasets
   - Implement distributed processing
   - Design fault-tolerant systems

3. **Innovation** (30%)
   - Extend Dagster capabilities
   - Integrate emerging technologies
   - Solve complex problems

### Certification Paths

#### Dagster Developer Certification
- **Prerequisites**: Complete Beginner and Intermediate tracks
- **Format**: 2-hour practical exam
- **Skills Tested**:
  - Asset development
  - Testing and debugging
  - Basic production deployment

#### Dagster Engineer Certification
- **Prerequisites**: Developer certification + 6 months experience
- **Format**: 4-hour practical + theory exam
- **Skills Tested**:
  - Complex pipeline design
  - Performance optimization
  - Production operations

#### Dagster Architect Certification
- **Prerequisites**: Engineer certification + 1 year experience
- **Format**: Full day assessment + project presentation
- **Skills Tested**:
  - Enterprise architecture
  - Custom framework development
  - Team leadership

---

## Resources & Next Steps

### Official Resources
- **Documentation**: https://docs.dagster.io
- **GitHub**: https://github.com/dagster-io/dagster
- **Community Slack**: https://dagster.io/slack
- **Blog**: https://dagster.io/blog

### Community Resources
- **Awesome Dagster**: Curated list of resources
- **Dagster Examples**: https://github.com/dagster-io/dagster/tree/master/examples
- **YouTube Channel**: Video tutorials and talks

### Recommended Learning Path
1. **Month 1**: Complete Beginner track
2. **Month 2-3**: Work through Intermediate track
3. **Month 4-5**: Advanced topics and specialization
4. **Month 6+**: Contribute to open source, build production systems

### Career Opportunities
- **Data Engineer**: Build and maintain data pipelines
- **Analytics Engineer**: Create analytics assets
- **Platform Engineer**: Design data platforms
- **ML Engineer**: Implement ML pipelines
- **Data Architect**: Design enterprise data systems

### Continuing Education
1. **Stay Updated**:
   - Follow Dagster releases
   - Attend community events
   - Read the blog

2. **Expand Skills**:
   - Learn complementary tools (dbt, Spark)
   - Study cloud platforms
   - Understand data modeling

3. **Contribute**:
   - Answer community questions
   - Write blog posts
   - Contribute to open source

---

## Conclusion

Congratulations on completing this comprehensive Dagster training guide! You now have the knowledge and skills to build production-grade data pipelines with Dagster.

Remember:
- **Start Small**: Begin with simple pipelines and gradually increase complexity
- **Focus on Assets**: Think about what data should exist, not just how to compute it
- **Test Everything**: Good tests make refactoring and scaling easier
- **Monitor and Iterate**: Continuously improve your pipelines based on metrics
- **Engage with Community**: Learn from others and share your knowledge

The field of data engineering is constantly evolving, and Dagster is at the forefront of modern practices. Keep learning, keep building, and keep pushing the boundaries of what's possible with data.

Happy orchestrating! 🚀
            obj.to_parquet(path)
            context.log.info(f"Saved {len(obj)} rows to {path}")

    def load_input(self, context):
        """Load DataFrame from Parquet"""
        path = os.path.join(
            self.base_dir,
            f"{context.upstream_output.asset_key.path[-1]}.parquet"
        )
        return pd.read_parquet(path)

@io_manager(config_schema={"base_dir": str})
def parquet_io_manager(init_context):
    return ParquetIOManager(init_context.resource_config["base_dir"])

# Use with assets
@asset(io_manager_key="parquet_io")
def processed_data():
    return pd.DataFrame({"col1": [1, 2, 3], "col2": [4, 5, 6]})
```

##### Review Exercise (2 hours)
Create a resource for connecting to an S3 bucket and an IO manager for storing DataFrames as CSV files in S3.

### Module 1.4: Scheduling and Sensors (8 hours)

#### Overview
Automating pipeline execution with schedules and event-driven triggers.

#### Content Outline

##### Theory (2 hours)
- Schedule types and configuration
- Sensors for event-driven pipelines
- Partitions and backfills

##### Hands-on Lab (4 hours)

**Lab 1.4.1: Basic Schedules**
```python
from dagster import schedule, job, op, ScheduleDefinition, DefaultScheduleStatus
from datetime import datetime

@op
def download_daily_data(context):
    date = context.scheduled_execution_time.strftime("%Y-%m-%d")
    context.log.info(f"Downloading data for {date}")
    # Download logic here
    return f"data_{date}.csv"

@job
def daily_data_pipeline():
    download_daily_data()

# Define schedule
daily_schedule = ScheduleDefinition(
    job=daily_data_pipeline,
    cron_schedule="0 6 * * *",  # 6 AM daily
    execution_timezone="US/Eastern",
    default_status=DefaultScheduleStatus.RUNNING
)

# Alternative using decorator
@schedule(
    cron_schedule="0 */4 * * *",  # Every 4 hours
    job=daily_data_pipeline,
    execution_timezone="UTC"
)
def four_hour_schedule(context):
    return {}
```

**Lab 1.4.2: File Sensors**
```python
from dagster import sensor, RunRequest, SkipReason, asset_sensor
import os

@sensor(job=daily_data_pipeline, minimum_interval_seconds=30)
def new_file_sensor(context):
    """Trigger job when new files appear"""
    data_dir = "/data/incoming"
    
    # Get list of files
    files = os.listdir(data_dir)
    
    # Check for new files since last run
    last_run_files = context.cursor or ""
    new_files = [f for f in files if f not in last_run_files]
    
    if new_files:
        # Update cursor
        context.update_cursor(",".join(files))
        
        # Trigger runs for each new file
        for file in new_files:
            yield RunRequest(
                run_key=file,
                run_config={
                    "resources": {
                        "input_file": {"config": {"path": os.path.join(data_dir, file)}}
                    }
                }
            )
    else:
        yield SkipReason("No new files found")

# Asset sensor example
@asset_sensor(asset_key="raw_data", job=process_raw_data_job)
def raw_data_sensor(context, asset_event):
    """Trigger processing when raw_data is updated"""
    return RunRequest(
        run_config={
            "ops": {
                "process": {
                    "config": {
                        "partition_date": asset_event.dagster_event.partition
                    }
                }
            }
        }
    )
```

##### Mini-Project (2 hours)
Build a scheduled pipeline that:
1. Runs daily at midnight
2. Has a sensor that triggers on S3 file uploads
3. Processes data based on date partitions

### Module 1.5: Basic Testing and Debugging (6 hours)

#### Overview
Testing strategies for data pipelines.

#### Content Outline

##### Theory (1 hour)
- Testing pyramid for data pipelines
- Unit vs integration tests
- Test fixtures and mocking

##### Hands-on Lab (3 hours)

**Lab 1.5.1: Unit Testing Assets**
```python
# tests/test_assets.py
import pytest
import pandas as pd
from dagster import build_asset_context
from my_project.assets import process_customer_data

def test_process_customer_data():
    # Create test data
    test_input = pd.DataFrame({
        'customer_id': [1, 2, 3],
        'purchase_amount': [100, 200, 150]
    })
    
    # Build test context
    context = build_asset_context()
    
    # Run asset function
    result = process_customer_data(context, test_input)
    
    # Assertions
    assert len(result) == 3
    assert 'total_spent' in result.columns
    assert result['total_spent'].sum() == 450

# Test with mocked resources
def test_asset_with_database(mocker):
    # Mock database resource
    mock_db = mocker.Mock()
    mock_db.query.return_value = [
        {'id': 1, 'name': 'Test Customer'}
    ]
    
    context = build_asset_context(
        resources={"database": mock_db}
    )
    
    result = customers_from_db(context)
    assert len(result) == 1
```

**Lab 1.5.2: Integration Testing**
```python
from dagster import DagsterInstance, execute_job
from my_project.jobs import etl_job

def test_etl_job_execution():
    # Create test instance
    instance = DagsterInstance.ephemeral()
    
    # Execute job
    result = execute_job(
        etl_job,
        instance=instance,
        run_config={
            "resources": {
                "io_manager": {
                    "config": {"base_path": "/tmp/test"}
                }
            }
        }
    )
    
    # Check execution success
    assert result.success
    assert result.get_job_success_event()
    
    # Verify outputs
    materialization_events = result.get_asset_materialization_events()
    assert len(materialization_events) > 0
```

##### Capstone Project (2 hours)
Build a complete test suite for your ETL pipeline including:
- Unit tests for each asset
- Integration test for the full pipeline
- Test data fixtures

---

## Level 2: Intermediate Track

### Module 2.1: Advanced Asset Patterns (12 hours)

#### Overview
Complex asset relationships and patterns for real-world scenarios.

#### Learning Objectives
- Multi-asset definitions
- Dynamic asset generation
- Asset partitions and backfills
- Cross-job asset dependencies

#### Content Outline

##### Theory (3 hours)
- Multi-assets and asset factories
- Partitioned assets
- Asset observations vs materializations
- Source assets and external dependencies

##### Hands-on Lab (7 hours)

**Lab 2.1.1: Multi-Assets**
```python
from dagster import multi_asset, AssetOut, Output
import pandas as pd

@multi_asset(
    outs={
        "orders_summary": AssetOut(description="Order aggregations"),
        "customer_ltv": AssetOut(description="Customer lifetime value"),
        "product_performance": AssetOut(description="Product metrics")
    }
)
def commerce_analytics(context, raw_orders: pd.DataFrame):
    """Generate multiple analytics assets from orders"""
    
    # Orders summary
    orders_summary = raw_orders.groupby('date').agg({
        'order_id': 'count',
        'total_amount': 'sum'
    }).rename(columns={'order_id': 'order_count'})
    
    # Customer LTV
    customer_ltv = raw_orders.groupby('customer_id').agg({
        'total_amount': ['sum', 'mean', 'count']
    }).round(2)
    
    # Product performance
    product_performance = raw_orders.groupby('product_id').agg({
        'quantity': 'sum',
        'total_amount': 'sum'
    }).sort_values('total_amount', ascending=False)
    
    return (
        Output(orders_summary, "orders_summary"),
        Output(customer_ltv, "customer_ltv"),
        Output(product_performance, "product_performance")
    )
```

**Lab 2.1.2: Partitioned Assets**
```python
from dagster import (
    asset, 
    DailyPartitionsDefinition,
    MonthlyPartitionsDefinition,
    PartitionMapping,
    IdentityPartitionMapping,
    LastPartitionMapping,
    AssetIn
)
from datetime import datetime

# Define partitions
daily_partitions = DailyPartitionsDefinition(start_date="2024-01-01")
monthly_partitions = MonthlyPartitionsDefinition(start_date="2024-01-01")

@asset(
    partitions_def=daily_partitions,
    metadata={"partition_expr": "date"}
)
def daily_sales_data(context) -> pd.DataFrame:
    """Load sales data for a specific date"""
    partition_date = context.partition_key
    
    # In practice, query database with date filter
    query = f"""
    SELECT * FROM sales 
    WHERE date = '{partition_date}'
    """
    
    context.log.info(f"Loading data for {partition_date}")
    
    # Simulated data
    return pd.DataFrame({
        'date': [partition_date],
        'revenue': [1000],
        'orders': [50]
    })

@asset(
    partitions_def=monthly_partitions,
    ins={
        "daily_sales_data": AssetIn(
            partition_mapping=PartitionMapping(
                partition_fn=lambda partition_key: [
                    f"{partition_key}-{str(day).zfill(2)}"
                    for day in range(1, 32)
                    if datetime.strptime(f"{partition_key}-{str(day).zfill(2)}", "%Y-%m-%d").month == 
                    datetime.strptime(partition_key, "%Y-%m").month
                ]
            )
        )
    }
)
def monthly_sales_summary(daily_sales_data: pd.DataFrame) -> pd.DataFrame:
    """Aggregate daily sales into monthly summary"""
    return daily_sales_data.groupby(
        pd.Grouper(key='date', freq='M')
    ).agg({
        'revenue': 'sum',
        'orders': 'sum'
    })
```

**Lab 2.1.3: Asset Factories**
```python
from dagster import asset, AssetsDefinition
from typing import List

def create_table_assets(tables: List[str], source_schema: str) -> List[AssetsDefinition]:
    """Factory to create assets for multiple database tables"""
    assets = []
    
    for table in tables:
        @asset(name=f"bronze_{table}")
        def _bronze_asset(context):
            query = f"SELECT * FROM {source_schema}.{table}"
            context.log.info(f"Loading {table} from {source_schema}")
            # Load data logic here
            return pd.DataFrame()  # Placeholder
        
        @asset(name=f"silver_{table}", ins={f"bronze_{table}": AssetIn()})
        def _silver_asset(context, **kwargs):
            bronze_data = kwargs[f"bronze_{table}"]
            # Clean and transform data
            context.log.info(f"Processing {table} to silver layer")
            return bronze_data  # Transformed data
        
        assets.extend([_bronze_asset, _silver_asset])
    
    return assets

# Generate assets for multiple tables
table_assets = create_table_assets(
    tables=["customers", "orders", "products"],
    source_schema="raw"
)
```

##### Mini-Project (2 hours)
Build a partitioned data pipeline that:
1. Loads daily transaction data
2. Creates weekly and monthly aggregations
3. Handles late-arriving data with asset observations

### Module 2.2: Ops, Graphs, and Jobs (10 hours)

#### Overview
Building complex pipelines with ops and graphs.

#### Content Outline

##### Theory (2 hours)
- Ops vs Assets: When to use each
- Graph composition patterns
- Dynamic graphs
- Op configuration and outputs

##### Hands-on Lab (6 hours)

**Lab 2.2.1: Complex Op Chains**
```python
from dagster import op, job, Out, Output, graph, DynamicOut, DynamicOutput
import pandas as pd

@op(
    out={
        "validated": Out(description="Validated records"),
        "rejected": Out(description="Rejected records")
    }
)
def validate_data(context, raw_data: pd.DataFrame):
    """Validate data and split into valid/invalid"""
    valid_mask = raw_data['amount'] > 0
    
    validated = raw_data[valid_mask]
    rejected = raw_data[~valid_mask]
    
    context.log.info(f"Validated: {len(validated)}, Rejected: {len(rejected)}")
    
    yield Output(validated, "validated")
    yield Output(rejected, "rejected")

@op
def process_valid_records(context, records: pd.DataFrame):
    """Process validated records"""
    # Processing logic
    return records

@op
def log_rejected_records(context, records: pd.DataFrame):
    """Log rejected records for review"""
    context.log.warning(f"Rejected {len(records)} records")
    # Save to error table or file
    return records

@job
def data_validation_pipeline():
    validated, rejected = validate_data()
    process_valid_records(validated)
    log_rejected_records(rejected)
```

**Lab 2.2.2: Dynamic Graphs**
```python
@op(out=DynamicOut())
def split_by_category(context, data: pd.DataFrame):
    """Split data by category for parallel processing"""
    categories = data['category'].unique()
    
    for category in categories:
        category_data = data[data['category'] == category]
        yield DynamicOutput(
            category_data,
            mapping_key=category,
            metadata={"rows": len(category_data)}
        )

@op
def process_category(context, category_data: pd.DataFrame):
    """Process data for a specific category"""
    # Category-specific processing
    return category_data.describe()

@op
def combine_results(context, results: List[pd.DataFrame]):
    """Combine results from all categories"""
    return pd.concat(results)

@graph
def dynamic_processing():
    category_splits = split_by_category()
    processed = category_splits.map(process_category)
    return combine_results(processed.collect())

dynamic_job = dynamic_processing.to_job()
```

**Lab 2.2.3: Graph Composition**
```python
@graph
def data_quality_subgraph(raw_data):
    """Reusable data quality checking graph"""
    
    @op
    def check_nulls(data):
        null_counts = data.isnull().sum()
        return null_counts
    
    @op
    def check_duplicates(data):
        duplicate_count = data.duplicated().sum()
        return duplicate_count
    
    @op
    def generate_quality_report(nulls, duplicates):
        return {
            "null_counts": nulls.to_dict(),
            "duplicate_count": duplicates
        }
    
    nulls = check_nulls(raw_data)
    duplicates = check_duplicates(raw_data)
    return generate_quality_report(nulls, duplicates)

@job
def etl_with_quality_checks():
    raw = load_raw_data()
    quality_report = data_quality_subgraph(raw)
    transformed = transform_data(raw)
    load_to_warehouse(transformed, quality_report)
```

##### Exercise (2 hours)
Build a dynamic graph that:
1. Splits data by region
2. Processes each region in parallel
3. Applies different business rules per region
4. Combines results

### Module 2.3: Advanced Resources and Configuration (10 hours)

#### Overview
Managing complex resource dependencies and configurations.

#### Content Outline

##### Theory (2 hours)
- Resource initialization and teardown
- Nested resources
- Environment-specific configurations
- Secrets management

##### Hands-on Lab (6 hours)

**Lab 2.3.1: Complex Resource Management**
```python
from dagster import resource, configured, InitResourceContext
from typing import Dict
import boto3
import snowflake.connector

class DataWarehouse:
    def __init__(self, connection_params: Dict):
        self.conn = snowflake.connector.connect(**connection_params)
    
    def execute_query(self, query: str):
        cursor = self.conn.cursor()
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()
    
    def close(self):
        self.conn.close()

@resource(
    config_schema={
        "account": str,
        "user": str,
        "password": str,
        "warehouse": str,
        "database": str,
        "schema": str
    }
)
def snowflake_resource(init_context: InitResourceContext):
    """Snowflake warehouse resource"""
    config = init_context.resource_config
    warehouse = DataWarehouse(config)
    yield warehouse
    warehouse.close()

@resource(
    required_resource_keys={"secrets_manager"},
    config_schema={"secret_name": str}
)
def snowflake_with_secrets(init_context: InitResourceContext):
    """Snowflake resource with AWS Secrets Manager"""
    secrets = init_context.resources.secrets_manager
    secret_name = init_context.resource_config["secret_name"]
    
    # Retrieve credentials from secrets manager
    creds = secrets.get_secret(secret_name)
    
    warehouse = DataWarehouse(creds)
    yield warehouse
    warehouse.close()

# Environment-specific configurations
snowflake_dev = snowflake_resource.configured({
    "account": "dev_account",
    "warehouse": "DEV_WH",
    "database": "DEV_DB"
})

snowflake_prod = snowflake_resource.configured({
    "account": {"env": "SNOWFLAKE_ACCOUNT"},
    "warehouse": "PROD_WH",
    "database": "PROD_DB"
})
```

**Lab 2.3.2: Resource Dependencies**
```python
@resource
def aws_session(init_context):
    """AWS session resource"""
    return boto3.Session(
        region_name=init_context.resource_config.get("region", "us-east-1")
    )

@resource(required_resource_keys={"aws_session"})
def s3_client(init_context):
    """S3 client resource"""
    session = init_context.resources.aws_session
    return session.client("s3")

@resource(required_resource_keys={"aws_session"})
def secrets_manager(init_context):
    """AWS Secrets Manager resource"""
    session = init_context.resources.aws_session
    client = session.client("secretsmanager")
    
    class SecretsManagerResource:
        def get_secret(self, secret_name: str):
            response = client.get_secret_value(SecretId=secret_name)
            return json.loads(response["SecretString"])
    
    return SecretsManagerResource()

# Complete resource configuration
resources = {
    "aws_session": aws_session.configured({"region": "us-west-2"}),
    "s3": s3_client,
    "secrets_manager": secrets_manager,
    "warehouse": snowflake_with_secrets.configured({
        "secret_name": "snowflake/prod/credentials"
    })
}
```

##### Project (2 hours)
Create a resource system that:
1. Manages connections to multiple data sources
2. Handles authentication via secrets manager
3. Implements connection pooling
4. Provides environment-specific configurations

### Module 2.4: Testing Strategies (10 hours)

#### Overview
Comprehensive testing approaches for data pipelines.

#### Content Outline

##### Theory (2 hours)
- Test pyramid for data engineering
- Property-based testing
- Data quality testing
- Performance testing

##### Hands-on Lab (6 hours)

**Lab 2.4.1: Advanced Testing Patterns**
```python
import pytest
from dagster import (
    build_op_context, 
    build_asset_context,
    materialize,
    DagsterInstance,
    AssetMaterialization
)
from unittest.mock import Mock, patch
import pandas as pd
from pandas.testing import assert_frame_equal

# Fixture for test data
@pytest.fixture
def sample_orders():
    return pd.DataFrame({
        'order_id': range(1, 101),
        'customer_id': [i % 20 for i in range(1, 101)],
        'amount': [100 + i * 10 for i in range(100)],
        'date': pd.date_range('2024-01-01', periods=100)
    })

# Property-based testing
from hypothesis import given, strategies as st
from hypothesis.extra.pandas import data_frames, column

@given(
    df=data_frames(
        columns=[
            column('amount', dtype=float, min_value=0, max_value=10000),
            column('quantity', dtype=int, min_value=1, max_value=100)
        ],
        index=st.integers(min_value=0, max_value=1000)
    )
)
def test_calculate_total_invariants(df):
    """Test that total calculation maintains invariants"""
    result = calculate_order_total(df)
    
    # Invariants
    assert (result['total'] >= 0).all()
    assert (result['total'] == result['amount'] * result['quantity']).all()

# Testing assets with mocked IO
def test_transform_orders_asset(sample_orders):
    # Create context with mocked IO manager
    context = build_asset_context(
        resources={
            "io_manager": Mock()
        }
    )
    
    # Run asset
    result = transform_orders(context, sample_orders)
    
    # Assertions
    assert 'total_amount' in result.columns
    assert len(result) == len(sample_orders)
    
    # Verify IO manager was called
    context.resources.io_manager.handle_output.assert_called_once()

# Integration testing with materialization
def test_asset_materialization():
    with DagsterInstance.ephemeral() as instance:
        # Materialize assets
        result = materialize(
            [orders_asset, orders_summary_asset],
            instance=instance
        )
        
        # Check materializations
        assert result.success
        materializations = result.get_asset_materialization_events()
        assert len(materializations) == 2
        
        # Verify metadata
        summary_mat = next(
            m for m in materializations 
            if m.asset_key.path[0] == "orders_summary"
        )
        assert "row_count" in summary_mat.metadata
```

**Lab 2.4.2: Data Quality Testing**
```python
from dagster import asset, AssetIn, Output, ExpectationResult
import pandera as pa

# Define data schema
orders_schema = pa.DataFrameSchema({
    "order_id": pa.Column(int, unique=True, nullable=False),
    "customer_id": pa.Column(int, nullable=False),
    "amount": pa.Column(float, checks=pa.Check.greater_than(0)),
    "status": pa.Column(str, checks=pa.Check.isin(["pending", "completed", "cancelled"])),
    "created_at": pa.Column("datetime64[ns]")
})

@asset
def validated_orders(raw_orders: pd.DataFrame) -> Output[pd.DataFrame]:
    """Validate orders data against schema"""
    
    # Schema validation
    try:
        validated_df = orders_schema.validate(raw_orders)
        validation_passed = True
        error_msg = None
    except pa.errors.SchemaErrors as e:
        validated_df = raw_orders
        validation_passed = False
        error_msg = str(e)
    
    # Data quality checks
    expectations = []
    
    # Check: No duplicate order IDs
    duplicates = validated_df['order_id'].duplicated().sum()
    expectations.append(
        ExpectationResult(
            success=duplicates == 0,
            label="unique_order_ids",
            description=f"Found {duplicates} duplicate order IDs"
        )
    )
    
    # Check: All amounts positive
    negative_amounts = (validated_df['amount'] <= 0).sum()
    expectations.append(
        ExpectationResult(
            success=negative_amounts == 0,
            label="positive_amounts",
            description=f"Found {negative_amounts} non-positive amounts"
        )
    )
    
    # Check: Date range reasonable
    date_range_valid = (
        validated_df['created_at'].min() >= pd.Timestamp('2020-01-01') and
        validated_df['created_at'].max() <= pd.Timestamp.now()
    )
    expectations.append(
        ExpectationResult(
            success=date_range_valid,
            label="valid_date_range",
            description="Order dates within expected range"
        )
    )
    
    return Output(
        value=validated_df,
        metadata={
            "schema_validation": validation_passed,
            "row_count": len(validated_df),
            "validation_error": error_msg
        },
        expectation_results=expectations
    )

# Test the validation
def test_order_validation():
    # Valid data
    valid_orders = pd.DataFrame({
        'order_id': [1, 2, 3],
        'customer_id': [10, 20, 30],
        'amount': [100.0, 200.0, 150.0],
        'status': ['completed', 'pending', 'completed'],
        'created_at': pd.date_range('2024-01-01', periods=3)
    })
    
    context = build_asset_context()
    output = validated_orders(valid_orders)
    
    assert output.metadata["schema_validation"] == True
    assert all(e.success for e in output.expectation_results)
    
    # Invalid data
    invalid_orders = valid_orders.copy()
    invalid_orders.loc[1, 'amount'] = -50  # Invalid amount
    
    output = validated_orders(invalid_orders)
    assert not all(e.success for e in output.expectation_results)
```

##### Capstone (2 hours)
Design and implement a comprehensive test suite for a multi-asset pipeline including:
1. Unit tests with mocked dependencies
2. Data quality validation tests
3. Integration tests with test database
4. Performance benchmarks

### Module 2.5: Monitoring and Observability (8 hours)

#### Overview
Building observable data pipelines with comprehensive monitoring.

#### Content Outline

##### Theory (2 hours)
- Observability principles for data pipelines
- Metadata and asset observations
- Custom logging and metrics
- Alerting strategies

##### Hands-on Lab (4 hours)

**Lab 2.5.1: Custom Metadata and Observations**
```python
from dagster import (
    asset, 
    AssetObservation, 
    MetadataValue,
    Output,
    job,
    op
)
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO
import base64

@asset
def sales_dashboard_data(context) -> Output[pd.DataFrame]:
    """Generate sales dashboard data with rich metadata"""
    
    # Generate data
    df = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=30),
        'revenue': [1000 + i * 50 + (i % 7) * 100 for i in range(30)],
        'orders': [50 + i * 2 for i in range(30)]
    })
    
    # Create visualization
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
    
    # Revenue plot
    ax1.plot(df['date'], df['revenue'])
    ax1.set_title('Daily Revenue')
    ax1.set_ylabel('Revenue ($)')
    
    # Orders plot
    ax2.bar(df['date'], df['orders'])
    ax2.set_title('Daily Orders')
    ax2.set_ylabel('Order Count')
    
    # Save plot to bytes
    buffer = BytesIO()
    plt.tight_layout()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    image_data = base64.b64encode(buffer.read()).decode()
    plt.close()
    
    # Calculate statistics
    stats = {
        'total_revenue': float(df['revenue'].sum()),
        'avg_daily_revenue': float(df['revenue'].mean()),
        'max_daily_revenue': float(df['revenue'].max()),
        'total_orders': int(df['orders'].sum())
    }
    
    return Output(
        value=df,
        metadata={
            "num_rows": len(df),
            "columns": MetadataValue.json(list(df.columns)),
            "statistics": MetadataValue.json(stats),
            "preview": MetadataValue.md(df.head(10).to_markdown()),
            "visualization": MetadataValue.md(f"![Sales Dashboard](data:image/png;base64,{image_data})"),
            "data_quality_score": MetadataValue.float(0.95)
        }
    )

# Asset observation job
@op
def observe_external_table(context):
    """Check external data source without materializing"""
    
    # Check row count in external system
    row_count = 1000000  # In practice, query external system
    
    # Log observation
    context.log_event(
        AssetObservation(
            asset_key="external_customer_data",
            metadata={
                "row_count": row_count,
                "last_updated": MetadataValue.timestamp(pd.Timestamp.now().timestamp()),
                "source_system": "CRM",
                "health_check": "PASSED"
            }
        )
    )

@job
def data_observation_job():
    observe_external_table()
```

**Lab 2.5.2: Custom Logging and Metrics**
```python
from dagster import asset, get_dagster_logger
from typing import Dict
import time

class PipelineMetrics:
    """Custom metrics collector"""
    
    def __init__(self):
        self.metrics = {}
    
    def record_timing(self, operation: str, duration: float):
        if operation not in self.metrics:
            self.metrics[operation] = []
        self.metrics[operation].append(duration)
    
    def get_summary(self) -> Dict:
        summary = {}
        for op, timings in self.metrics.items():
            summary[op] = {
                'count': len(timings),
                'total': sum(timings),
                'avg': sum(timings) / len(timings),
                'max': max(timings)
            }
        return summary

@asset
def monitored_transformation(context, raw_data: pd.DataFrame) -> pd.DataFrame:
    """Transformation with detailed monitoring"""
    logger = get_dagster_logger()
    metrics = PipelineMetrics()
    
    # Monitor data quality
    logger.info(f"Input data shape: {raw_data.shape}")
    null_counts = raw_data.isnull().sum()
    if null_counts.any():
        logger.warning(f"Found null values: {null_counts.to_dict()}")
    
    # Time operations
    start = time.time()
    
    # Step 1: Data cleaning
    step_start = time.time()
    cleaned_data = raw_data.dropna()
    metrics.record_timing('cleaning', time.time() - step_start)
    logger.info(f"Removed {len(raw_data) - len(cleaned_data)} rows with nulls")
    
    # Step 2: Transformation
    step_start = time.time()
    transformed_data = cleaned_data.copy()
    transformed_data['processed_at'] = pd.Timestamp.now()
    metrics.record_timing('transformation', time.time() - step_start)
    
    # Log final metrics
    total_duration = time.time() - start
    logger.info(f"Total processing time: {total_duration:.2f}s")
    logger.info(f"Processing metrics: {metrics.get_summary()}")
    
    # Add metrics to context
    context.add_output_metadata({
        "processing_time": total_duration,
        "rows_processed": len(transformed_data),
        "rows_dropped": len(raw_data) - len(transformed_data),
        "performance_metrics": MetadataValue.json(metrics.get_summary())
    })
    
    return transformed_data
```

##### Exercise (2 hours)
Build a monitoring system that:
1. Tracks pipeline performance metrics
2. Monitors data quality scores
3. Sends alerts on failures
4. Creates a dashboard of key metrics

### Module 2.6: CI/CD for Data Pipelines (10 hours)

#### Overview
Implementing continuous integration and deployment for Dagster pipelines.

#### Content Outline

##### Theory (2 hours)
- CI/CD principles for data pipelines
- Environment promotion strategies
- Infrastructure as code
- Deployment patterns

##### Hands-on Lab (6 hours)

**Lab 2.6.1: GitHub Actions CI**
```yaml
# .github/workflows/dagster-ci.yml
name: Dagster CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --statistics
    
    - name: Type check with mypy
      run: mypy my_dagster_project --ignore-missing-imports
    
    - name: Run tests
      run: |
        pytest tests/ -v --cov=my_dagster_project --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
    
    - name: Build and validate Dagster definitions
      run: |
        python -c "from my_dagster_project import defs; print('Definitions loaded successfully')"

  integration-test:
    runs-on: ubuntu-latest
    needs: test
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run integration tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      run: |
        pytest tests/integration/ -v -m integration
```

**Lab 2.6.2: Docker Deployment**
```dockerfile
# Dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create non-root user
RUN useradd -m -u 1000 dagster && chown -R dagster:dagster /app
USER dagster

# Expose Dagit port
EXPOSE 3000

# Default command
CMD ["dagit", "-h", "0.0.0.0", "-p", "3000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: dagster
      POSTGRES_USER: dagster
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dagster"]
      interval: 10s
      timeout: 5s
      retries: 5

  dagit:
    build: .
    command: dagit -h 0.0.0.0 -p 3000 -w workspace.yaml
    ports:
      - "3000:3000"
    environment:
      DAGSTER_POSTGRES_HOST: postgres
      DAGSTER_POSTGRES_USER: dagster
      DAGSTER_POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DAGSTER_POSTGRES_DB: dagster
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./my_dagster_project:/app/my_dagster_project
      - ./workspace.yaml:/app/workspace.yaml

  daemon:
    build: .
    command: dagster-daemon run
    environment:
      DAGSTER_POSTGRES_HOST: postgres
      DAGSTER_POSTGRES_USER: dagster
      DAGSTER_POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DAGSTER_POSTGRES_DB: dagster
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./my_dagster_project:/app/my_dagster_project
      - ./workspace.yaml:/app/workspace.yaml

volumes:
  postgres_data:
```

**Lab 2.6.3: Terraform Infrastructure**
```hcl
# infrastructure/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "dagster" {
  name = "dagster-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task Definition for Dagit
resource "aws_ecs_task_definition" "dagit" {
  family                   = "dagit"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "dagit"
      image = "${aws_ecr_repository.dagster.repository_url}:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "DAGSTER_POSTGRES_HOST"
          value = aws_db_instance.dagster.address
        },
        {
          name  = "DAGSTER_POSTGRES_DB"
          value = "dagster"
        }
      ]
      
      secrets = [
        {
          name      = "DAGSTER_POSTGRES_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.dagster.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "dagit"
        }
      }
    }
  ])
}

# ALB for Dagit
resource "aws_lb" "dagit" {
  name               = "dagit-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id
}

# ECS Service
resource "aws_ecs_service" "dagit" {
  name            = "dagit"
  cluster         = aws_ecs_cluster.dagster.id
  task_definition = aws_ecs_task_definition.dagit.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.dagit.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dagit.arn
    container_name   = "dagit"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.dagit]
}
```

##### Project (2 hours)
Implement a complete CI/CD pipeline that:
1. Runs tests on every commit
2. Builds and pushes Docker images
3. Deploys to staging environment
4. Promotes to production with approval

---

## Level 3: Advanced Track

### Module 3.1: Custom Executors and Advanced Orchestration (12 hours)

#### Overview
Building custom execution environments and advanced orchestration patterns.

#### Learning Objectives
- Implement custom executors
- Design for high-scale execution
- Build fault-tolerant pipelines
- Optimize resource utilization

#### Content Outline

##### Theory (3 hours)
- Executor architecture
- Distributed execution patterns
- Resource management strategies
- Fault tolerance and recovery

##### Hands-on Lab (7 hours)

**Lab 3.1.1: Custom Kubernetes Executor**
```python
from dagster import (
    executor,
    ExecutorDefinition,
    multiple_process_executor_requirements,
    DagsterInstance
)
from dagster._core.execution.plan.state import KnownExecutionState
from dagster._core.execution.retries import RetryMode
from kubernetes import client, config
import yaml

@executor(
    name="k8s_job_executor",
    config_schema={
        "namespace": str,
        "image": str,
        "service_account": str,
        "resources": {
            "requests": {
                "cpu": str,
                "memory": str
            },
            "limits": {
                "cpu": str,
                "memory": str
            }
        }
    }
)
@multiple_process_executor_requirements
def kubernetes_job_executor(init_context):
    """Custom executor that runs each op as a Kubernetes Job"""
    
    class K8sJobExecutor:
        def __init__(self, config):
            self.config = config
            self.k8s_client = self._init_k8s_client()
        
        def _init_k8s_client(self):
            config.load_incluster_config()  # For in-cluster execution
            return client.BatchV1Api()
        
        def execute(self, plan_context, execution_plan):
            # Execute each step as a K8s Job
            for step in execution_plan.get_steps_to_execute():
                self._launch_k8s_job(step, plan_context)
        
        def _launch_k8s_job(self, step, context):
            job_name = f"dagster-{step.key}-{context.run_id[:8]}"
            
            job_manifest = {
                "apiVersion": "batch/v1",
                "kind": "Job",
                "metadata": {
                    "name": job_name,
                    "namespace": self.config["namespace"]
                },
                "spec": {
                    "template": {
                        "spec": {
                            "serviceAccountName": self.config["service_account"],
                            "containers": [{
                                "name": "dagster-op",
                                "image": self.config["image"],
                                "command": ["dagster"],
                                "args": [
                                    "api", "execute_step",
                                    context.execution_plan_snapshot_id,
                                    step.key,
                                    context.instance.get_ref().to_json()
                                ],
                                "resources": self.config["resources"],
                                "env": [
                                    {"name": "DAGSTER_RUN_ID", "value": context.run_id},
                                    {"name": "DAGSTER_STEP_KEY", "value": step.key}
                                ]
                            }],
                            "restartPolicy": "Never"
                        }
                    },
                    "backoffLimit": 3
                }
            }
            
            self.k8s_client.create_namespaced_job(
                namespace=self.config["namespace"],
                body=job_manifest
            )
    
    return K8sJobExecutor(init_context.executor_config)

# Use in job definition
@job(
    executor_def=kubernetes_job_executor.configured({
        "namespace": "dagster",
        "image": "myregistry/dagster:latest",
        "service_account": "dagster-executor",
        "resources": {
            "requests": {"cpu": "500m", "memory": "1Gi"},
            "limits": {"cpu": "2", "memory": "4Gi"}
        }
    })
)
def distributed_pipeline():
    process_data()
```

**Lab 3.1.2: Dynamic Resource Allocation**
```python
from dagster import op, resource, job
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import psutil

class DynamicExecutor:
    """Executor that adjusts parallelism based on system resources"""
    
    def __init__(self):
        self.cpu_count = psutil.cpu_count()
        self.memory_gb = psutil.virtual_memory().total / (1024**3)
    
    def get_optimal_workers(self, task_type: str) -> int:
        """Determine optimal worker count based on task type and resources"""
        
        if task_type == "cpu_intensive":
            # Use 80% of CPU cores for CPU-bound tasks
            return max(1, int(self.cpu_count * 0.8))
        
        elif task_type == "io_intensive":
            # Use more workers for I/O-bound tasks
            return min(self.cpu_count * 4, 50)
        
        elif task_type == "memory_intensive":
            # Limit based on available memory (assuming 2GB per worker)
            return max(1, int(self.memory_gb / 2))
        
        return self.cpu_count

@resource
def dynamic_executor_resource(init_context):
    """Resource providing dynamic execution capabilities"""
    executor = DynamicExecutor()
    
    class ExecutorResource:
        def process_parallel(self, items, processor_func, task_type="cpu_intensive"):
            workers = executor.get_optimal_workers(task_type)
            init_context.log.info(f"Processing {len(items)} items with {workers} workers")
            
            if task_type == "io_intensive":
                pool_executor = ThreadPoolExecutor(max_workers=workers)
            else:
                pool_executor = ProcessPoolExecutor(max_workers=workers)
            
            try:
                results = list(pool_executor.map(processor_func, items))
                return results
            finally:
                pool_executor.shutdown()
    
    return ExecutorResource()

@op(required_resource_keys={"executor"})
def parallel_processing_op(context, data_batches):
    """Process data batches in parallel with dynamic resource allocation"""
    
    def process_batch(batch):
        # Simulate processing
        return len(batch)
    
    results = context.resources.executor.process_parallel(
        data_batches,
        process_batch,
        task_type="cpu_intensive"
    )
    
    context.log.info(f"Processed {sum(results)} total records")
    return results
```

**Lab 3.1.3: Fault-Tolerant Execution**
```python
from dagster import op, job, RetryPolicy, Backoff
from tenacity import retry, stop_after_attempt, wait_exponential
import random

# Op-level retry configuration
@op(
    retry_policy=RetryPolicy(
        max_retries=3,
        delay=5,  # seconds
        backoff=Backoff.EXPONENTIAL
    )
)
def flaky_api_call(context):
    """Op with built-in retry logic"""
    if random.random() < 0.7:  # 70% failure rate
        raise Exception("API call failed")
    return {"status": "success"}

# Custom retry logic with tenacity
@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=4, max=60)
)
def resilient_operation(data):
    """Operation with sophisticated retry logic"""
    # Simulate operation that might fail
    if random.random() < 0.3:
        raise Exception("Transient error")
    return process_data(data)

@op
def fault_tolerant_processing(context, input_data):
    """Process data with comprehensive error handling"""
    results = []
    failed_items = []
    
    for item in input_data:
        try:
            # Try processing with retries
            result = resilient_operation(item)
            results.append(result)
        except Exception as e:
            context.log.error(f"Failed to process item {item['id']}: {e}")
            failed_items.append({
                "item": item,
                "error": str(e),
                "timestamp": pd.Timestamp.now()
            })
    
    # Handle failed items
    if failed_items:
        context.log.warning(f"{len(failed_items)} items failed processing")
        # Could write to dead letter queue, alert, etc.
        
    return {
        "successful": results,
        "failed": failed_items,
        "success_rate": len(results) / len(input_data)
    }

# Circuit breaker pattern
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open
    
    def call(self, func, *args, **kwargs):
        if self.state == "open":
            if (pd.Timestamp.now() - self.last_failure_time).seconds > self.recovery_timeout:
                self.state = "half_open"
            else:
                raise Exception("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            if self.state == "half_open":
                self.state = "closed"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = pd.Timestamp.now()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "open"
            
            raise e

@resource
def circuit_breaker_resource():
    return CircuitBreaker()
```

##### Mini-Project (2 hours)
Build a custom executor that:
1. Distributes work across multiple machines
2. Handles node failures gracefully
3. Provides real-time execution metrics
4. Supports priority-based scheduling

### Module 3.2: Performance Optimization (12 hours)

#### Overview
Optimizing Dagster pipelines for performance and scale.

#### Content Outline

##### Theory (3 hours)
- Performance profiling techniques
- Memory optimization strategies
- Parallelization patterns
- Caching and memoization

##### Hands-on Lab (7 hours)

**Lab 3.2.1: Performance Profiling**
```python
from dagster import op, job, asset
import time
import memory_profiler
import cProfile
import pstats
from functools import wraps

def profile_performance(func):
    """Decorator to profile function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # CPU profiling
        profiler = cProfile.Profile()
        profiler.enable()
        
        # Memory profiling
        mem_before = memory_profiler.memory_usage()[0]
        
        # Time tracking
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            
            # Collect metrics
            end_time = time.time()
            mem_after = memory_profiler.memory_usage()[0]
            
            profiler.disable()
            
            # Log metrics
            if 'context' in kwargs:
                context = kwargs['context']
                context.log.info(f"Execution time: {end_time - start_time:.2f}s")
                context.log.info(f"Memory usage: {mem_after - mem_before:.2f}MB")
                
                # Add profiling data to metadata
                stats = pstats.Stats(profiler)
                stats.sort_stats('cumulative')
                
                context.add_output_metadata({
                    "execution_time_seconds": end_time - start_time,
                    "memory_usage_mb": mem_after - mem_before,
                    "cpu_profile": MetadataValue.text(stats.get_stats_profile())
                })
            
            return result
        except Exception as e:
            profiler.disable()
            raise e
    
    return wrapper

@asset
@profile_performance
def optimized_data_processing(context, large_dataset):
    """Process large dataset with performance monitoring"""
    
    # Chunk processing for memory efficiency
    chunk_size = 10000
    processed_chunks = []
    
    for i in range(0, len(large_dataset), chunk_size):
        chunk = large_dataset.iloc[i:i + chunk_size]
        
        # Process chunk
        processed = chunk.apply(lambda x: x * 2)  # Example processing
        processed_chunks.append(processed)
        
        # Log progress
        if i % (chunk_size * 10) == 0:
            context.log.info(f"Processed {i:,} rows")
    
    # Combine results
    result = pd.concat(processed_chunks, ignore_index=True)
    
    return result
```

**Lab 3.2.2: Parallel Processing Optimization**
```python
from dagster import op, Output, DynamicOutput
import numpy as np
from joblib import Parallel, delayed
import dask.dataframe as dd

@op(
    config_schema={
        "parallelism": int,
        "chunk_size": int
    }
)
def parallel_data_transform(context, input_data: pd.DataFrame):
    """Optimized parallel data transformation"""
    
    config = context.op_config
    n_jobs = config.get("parallelism", -1)  # -1 uses all cores
    chunk_size = config.get("chunk_size", 1000)
    
    # Method 1: Using joblib for embarrassingly parallel operations
    def process_chunk(chunk):
        # Complex transformation
        chunk['computed_col'] = chunk.apply(
            lambda row: complex_calculation(row), axis=1
        )
        return chunk
    
    # Split into chunks
    chunks = np.array_split(input_data, len(input_data) // chunk_size)
    
    # Process in parallel
    with context.log.info(f"Processing {len(chunks)} chunks with {n_jobs} workers"):
        results = Parallel(n_jobs=n_jobs)(
            delayed(process_chunk)(chunk) for chunk in chunks
        )
    
    return pd.concat(results, ignore_index=True)

@asset
def dask_optimized_processing(context, file_pattern: str):
    """Use Dask for out-of-core processing"""
    
    # Load data lazily with Dask
    ddf = dd.read_parquet(file_pattern)
    
    # Define transformations (lazy evaluation)
    ddf['year'] = ddf['date'].dt.year
    ddf['month'] = ddf['date'].dt.month
    
    # Groupby operation
    monthly_summary = ddf.groupby(['year', 'month']).agg({
        'revenue': 'sum',
        'quantity': 'sum',
        'order_id': 'count'
    })
    
    # Compute with progress bar
    with context.log.info("Computing Dask operations"):
        result = monthly_summary.compute()
    
    return result

# Memory-efficient streaming processing
@op
def streaming_aggregation(context, data_files: List[str]):
    """Process large files in streaming fashion"""
    
    aggregator = StreamingAggregator()
    
    for file_path in data_files:
        context.log.info(f"Processing {file_path}")
        
        # Process file in chunks
        for chunk in pd.read_csv(file_path, chunksize=10000):
            aggregator.update(chunk)
    
    return aggregator.get_result()

class StreamingAggregator:
    """Maintains running statistics without holding all data in memory"""
    
    def __init__(self):
        self.count = 0
        self.sum = 0
        self.sum_of_squares = 0
        self.min_val = float('inf')
        self.max_val = float('-inf')
    
    def update(self, chunk):
        self.count += len(chunk)
        self.sum += chunk['value'].sum()
        self.sum_of_squares += (chunk['value'] ** 2).sum()
        self.min_val = min(self.min_val, chunk['value'].min())
        self.max_val = max(self.max_val, chunk['value'].max())
    
    def get_result(self):
        mean = self.sum / self.count
        variance = (self.sum_of_squares / self.count) - mean**2
        
        return {
            'count': self.count,
            'mean': mean,
            'std': np.sqrt(variance),
            'min': self.min_val,
            'max': self.max_val
        }
```

**Lab 3.2.3: Caching and Memoization**
```python
from dagster import op, mem_io_manager, fs_io_manager
from functools import lru_cache
import hashlib
import pickle
import os

class CachingIOManager(IOManager):
    """IO Manager with intelligent caching"""
    
    def __init__(self, cache_dir):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_key(self, context):
        """Generate cache key based on inputs and config"""
        key_parts = [
            context.asset_key.to_string(),
            str(context.partition_key) if context.has_partition_key else "no_partition",
            # Include upstream dependencies
            str(sorted(context.upstream_output.asset_key.to_string() 
                      for upstream_output in context.upstream_outputs))
        ]
        
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def handle_output(self, context, obj):
        """Save output with caching"""
        cache_key = self._get_cache_key(context)
        cache_path = os.path.join(self.cache_dir, f"{cache_key}.pkl")
        
        with open(cache_path, 'wb') as f:
            pickle.dump(obj, f)
        
        # Also save metadata
        metadata_path = os.path.join(self.cache_dir, f"{cache_key}.metadata")
        metadata = {
            'timestamp': pd.Timestamp.now().isoformat(),
            'asset_key': context.asset_key.to_string(),
            'run_id': context.run_id
        }
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
    
    def load_input(self, context):
        """Load input with cache check"""
        cache_key = self._get_cache_key(context)
        cache_path = os.path.join(self.cache_dir, f"{cache_key}.pkl")
        
        if os.path.exists(cache_path):
            # Check cache validity
            metadata_path = os.path.join(self.cache_dir, f"{cache_key}.metadata")
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            cache_age = pd.Timestamp.now() - pd.Timestamp(metadata['timestamp'])
            
            if cache_age.days < 1:  # Cache valid for 1 day
                context.log.info(f"Loading from cache (age: {cache_age})")
                with open(cache_path, 'rb') as f:
                    return pickle.load(f)
        
        # Cache miss - compute normally
        context.log.info("Cache miss - computing fresh")
        return None

# Computation-level caching
@lru_cache(maxsize=128)
def expensive_computation(param1, param2):
    """Cached expensive computation"""
    time.sleep(5)  # Simulate expensive operation
    return param1 * param2

@op
def cached_processing(context, data):
    """Process with computation caching"""
    results = []
    cache_hits = 0
    
    for row in data.itertuples():
        # Cache key from row data
        key = (row.param1, row.param2)
        
        # Check if already computed
        if expensive_computation.cache_info().hits > cache_hits:
            cache_hits += 1
        
        result = expensive_computation(row.param1, row.param2)
        results.append(result)
    
    context.log.info(f"Cache hit rate: {cache_hits / len(data) * 100:.1f}%")
    
    return results
```

##### Project (2 hours)
Optimize a slow pipeline by:
1. Profiling to identify bottlenecks
2. Implementing parallel processing
3. Adding strategic caching
4. Measuring performance improvements

### Module 3.3: Complex Integration Patterns (12 hours)

#### Overview
Advanced integration patterns with external systems and tools.

#### Content Outline

##### Theory (3 hours)
- Integration architecture patterns
- Event-driven architectures
- API design for data pipelines
- Cross-system orchestration

##### Hands-on Lab (7 hours)

**Lab 3.3.1: Event-Driven Architecture**
```python
from dagster import op, job, sensor, RunRequest
import boto3
from kafka import KafkaConsumer, KafkaProducer
import json
from typing import Dict, List

# Kafka integration
class KafkaEventSensor:
    """Sensor that consumes from Kafka and triggers Dagster runs"""
    
    def __init__(self, bootstrap_servers: str, topic: str, group_id: str):
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            enable_auto_commit=False
        )
    
    def get_events(self, max_events: int = 100) -> List[Dict]:
        """Poll for new events"""
        events = []
        
        # Poll with timeout
        messages = self.consumer.poll(timeout_ms=1000, max_records=max_events)
        
        for topic_partition, records in messages.items():
            for record in records:
                events.append({
                    'topic': record.topic,
                    'partition': record.partition,
                    'offset': record.offset,
                    'timestamp': record.timestamp,
                    'key': record.key,
                    'value': record.value
                })
        
        return events
    
    def commit(self):
        """Commit consumed messages"""
        self.consumer.commit()

@sensor(job=process_events_job)
def kafka_event_sensor(context):
    """Sensor that triggers job on Kafka events"""
    
    kafka_sensor = KafkaEventSensor(
        bootstrap_servers="localhost:9092",
        topic="data-events",
        group_id="dagster-consumer"
    )
    
    events = kafka_sensor.get_events()
    
    if events:
        # Group events by type for batching
        events_by_type = {}
        for event in events:
            event_type = event['value'].get('type', 'unknown')
            if event_type not in events_by_type:
                events_by_type[event_type] = []
            events_by_type[event_type].append(event)
        
        # Create run requests
        for event_type, typed_events in events_by_type.items():
            yield RunRequest(
                run_key=f"{event_type}_{typed_events[0]['timestamp']}",
                run_config={
                    "ops": {
                        "process_events": {
                            "config": {
                                "events": typed_events,
                                "event_type": event_type
                            }
                        }
                    }
                }
            )
        
        # Commit after creating run requests
        kafka_sensor.commit()
        
        context.update_cursor(str(events[-1]['offset']))

# Event publishing
@op
def publish_events(context, processed_data: pd.DataFrame):
    """Publish processing results as events"""
    
    producer = KafkaProducer(
        bootstrap_servers="localhost:9092",
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    for _, row in processed_data.iterrows():
        event = {
            'type': 'data_processed',
            'timestamp': pd.Timestamp.now().isoformat(),
            'data': row.to_dict(),
            'run_id': context.run_id
        }
        
        producer.send('processed-data', value=event)
    
    producer.flush()
    context.log.info(f"Published {len(processed_data)} events")
```

**Lab 3.3.2: Cross-System Orchestration**
```python
from dagster import op, job, schedule, resource
import airflow_client
from prefect import Client as PrefectClient
import requests

@resource(
    config_schema={
        "airflow_url": str,
        "username": str,
        "password": str
    }
)
def airflow_client_resource(init_context):
    """Resource for triggering Airflow DAGs"""
    
    class AirflowClient:
        def __init__(self, config):
            self.base_url = config["airflow_url"]
            self.auth = (config["username"], config["password"])
        
        def trigger_dag(self, dag_id: str, conf: Dict = None):
            """Trigger an Airflow DAG"""
            url = f"{self.base_url}/api/v1/dags/{dag_id}/dagRuns"
            
            payload = {
                "conf": conf or {},
                "dag_run_id": f"triggered_by_dagster_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"
            }
            
            response = requests.post(
                url,
                json=payload,
                auth=self.auth
            )
            response.raise_for_status()
            
            return response.json()
        
        def get_dag_run_status(self, dag_id: str, dag_run_id: str):
            """Check status of a DAG run"""
            url = f"{self.base_url}/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}"
            
            response = requests.get(url, auth=self.auth)
            response.raise_for_status()
            
            return response.json()["state"]
    
    return AirflowClient(init_context.resource_config)

@op(required_resource_keys={"airflow"})
def trigger_airflow_pipeline(context, trigger_config: Dict):
    """Trigger an Airflow DAG from Dagster"""
    
    airflow = context.resources.airflow
    
    # Trigger the DAG
    result = airflow.trigger_dag(
        dag_id=trigger_config["dag_id"],
        conf=trigger_config.get("conf", {})
    )
    
    dag_run_id = result["dag_run_id"]
    context.log.info(f"Triggered Airflow DAG: {dag_run_id}")
    
    # Poll for completion
    max_polls = 60  # 5 minutes with 5-second intervals
    for i in range(max_polls):
        time.sleep(5)
        
        status = airflow.get_dag_run_status(
            trigger_config["dag_id"],
            dag_run_id
        )
        
        if status in ["success", "failed"]:
            break
        
        if i % 12 == 0:  # Log every minute
            context.log.info(f"Airflow DAG status: {status}")
    
    if status != "success":
        raise Exception(f"Airflow DAG failed with status: {status}")
    
    return {"dag_run_id": dag_run_id, "status": status}

# Multi-system orchestration job
@job(
    resource_defs={
        "airflow": airflow_client_resource,
        "warehouse": snowflake_resource,
        "notification": slack_resource
    }
)
def cross_platform_etl():
    """Orchestrate ETL across multiple platforms"""
    
    # Step 1: Extract data using Dagster
    raw_data = extract_from_source()
    
    # Step 2: Trigger Airflow for complex transformations
    airflow_result = trigger_airflow_pipeline(
        {"dag_id": "complex_transformations", "conf": {"date": "{{ ds }}"}}
    )
    
    # Step 3: Load results back to warehouse
    transformed_data = load_from_staging()
    final_data = post_process(transformed_data)
    
    # Step 4: Update dashboards and notify
    update_dashboards(final_data)
    send_notifications(final_data)
```

**Lab 3.3.3: API Gateway Pattern**
```python
from dagster import op, job, resource
from flask import Flask, request, jsonify
import threading
from dagster import DagsterInstance, RunRequest

# API Gateway for triggering pipelines
class DagsterAPIGateway:
    """REST API for triggering Dagster pipelines"""
    
    def __init__(self, instance: DagsterInstance):
        self.app = Flask(__name__)
        self.instance = instance
        self._setup_routes()
    
    def _setup_routes(self):
        @self.app.route('/health', methods=['GET'])
        def health():
            return jsonify({"status": "healthy"})
        
        @self.app.route('/trigger/<job_name>', methods=['POST'])
        def trigger_job(job_name):
            """Trigger a Dagster job via API"""
            try:
                # Get run config from request
                run_config = request.json or {}
                
                # Submit run
                run = self.instance.submit_run(
                    job_name,
                    run_config=run_config
                )
                
                return jsonify({
                    "status": "submitted",
                    "run_id": run.run_id,
                    "job_name": job_name
                })
            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": str(e)
                }), 400
        
        @self.app.route('/runs/<run_id>', methods=['GET'])
        def get_run_status(run_id):
            """Get status of a run"""
            run = self.instance.get_run_by_id(run_id)
            
            if not run:
                return jsonify({"error": "Run not found"}), 404
            
            return jsonify({
                "run_id": run_id,
                "status": run.status.value,
                "started_at": run.start_time,
                "ended_at": run.end_time,
                "tags": run.tags
            })
        
        @self.app.route('/assets/<asset_key>/materialize', methods=['POST'])
        def materialize_asset(asset_key):
            """Trigger asset materialization"""
            # Implementation for asset materialization
            pass
    
    def start(self, host='0.0.0.0', port=5000):
        """Start the API server"""
        self.app.run(host=host, port=port)

# GraphQL API for complex queries
from graphene import ObjectType, String, Field, Schema, List

class AssetNode(ObjectType):
    key = String()
    description = String()
    last_materialized = String()
    upstream_assets = List(lambda: AssetNode)

class Query(ObjectType):
    asset = Field(AssetNode, key=String())
    assets = List(AssetNode)
    
    def resolve_asset(self, info, key):
        # Resolve asset information
        pass
    
    def resolve_assets(self, info):
        # Return all assets
        pass

schema = Schema(query=Query)

# Webhook receiver for external triggers
@op
def process_webhook_data(context, webhook_payload: Dict):
    """Process data from webhook"""
    
    # Validate webhook signature
    signature = webhook_payload.get('signature')
    if not validate_webhook_signature(signature, webhook_payload['data']):
        raise ValueError("Invalid webhook signature")
    
    # Process based on event type
    event_type = webhook_payload['event_type']
    
    if event_type == 'data_updated':
        return process_data_update(webhook_payload['data'])
    elif event_type == 'schema_changed':
        return handle_schema_change(webhook_payload['data'])
    else:
        context.log.warning(f"Unknown event type: {event_type}")
```

##### Project (2 hours)
Design and implement an integration that:
1. Receives events from multiple sources
2. Orchestrates processing across systems
3. Provides a unified API
4. Handles failures gracefully

### Module 3.4: Data Quality and Governance (10 hours)

#### Overview
Implementing enterprise-grade data quality and governance.

#### Content Outline

##### Theory (2 hours)
- Data quality dimensions
- Governance frameworks
- Lineage and impact analysis
- Compliance and auditing

##### Hands-on Lab (6 hours)

**Lab 3.4.1: Data Quality Framework**
```python
from dagster import op, asset, AssetIn, Output, ExpectationResult
from typing import List, Dict, Any
import great_expectations as ge
from dataclasses import dataclass
import pandas as pd

@dataclass
class DataQualityRule:
    """Definition of a data quality rule"""
    name: str
    description: str
    severity: str  # critical, warning, info
    check_function: callable
    
class DataQualityFramework:
    """Comprehensive data quality checking framework"""
    
    def __init__(self):
        self.rules: Dict[str, List[DataQualityRule]] = {}
        self.results: List[Dict] = []
    
    def register_rule(self, asset_name: str, rule: DataQualityRule):
        """Register a quality rule for an asset"""
        if asset_name not in self.rules:
            self.rules[asset_name] = []
        self.rules[asset_name].append(rule)
    
    def check_data_quality(self, asset_name: str, data: pd.DataFrame) -> List[ExpectationResult]:
        """Run all rules for an asset"""
        results = []
        
        for rule in self.rules.get(asset_name, []):
            try:
                passed = rule.check_function(data)
                
                result = ExpectationResult(
                    success=passed,
                    label=rule.name,
                    description=rule.description,
                    metadata={
                        "severity": rule.severity,
                        "rows_checked": len(data),
                        "timestamp": pd.Timestamp.now().isoformat()
                    }
                )
                
                results.append(result)
                
                # Store for reporting
                self.results.append({
                    "asset": asset_name,
                    "rule": rule.name,
                    "passed": passed,
                    "severity": rule.severity,
                    "timestamp": pd.Timestamp.now()
                })
                
            except Exception as e:
                results.append(
                    ExpectationResult(
                        success=False,
                        label=rule.name,
                        description=f"Rule failed with error: {str(e)}"
                    )
                )
        
        return results
    
    def generate_quality_report(self) -> pd.DataFrame:
        """Generate quality report across all assets"""
        if not self.results:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.results)
        
        # Calculate metrics
        summary = df.groupby(['asset', 'severity']).agg({
            'passed': ['count', 'sum', 'mean']
        }).round(2)
        
        return summary

# Initialize framework
dq_framework = DataQualityFramework()

# Register rules
dq_framework.register_rule(
    "customer_data",
    DataQualityRule(
        name="no_duplicate_ids",
        description="Customer IDs should be unique",
        severity="critical",
        check_function=lambda df: df['customer_id'].duplicated().sum() == 0
    )
)

dq_framework.register_rule(
    "customer_data",
    DataQualityRule(
        name="valid_email_format",
        description="Email addresses should be valid",
        severity="warning",
        check_function=lambda df: df['email'].str.match(r'^[\w\.-]+@[\w\.-]+\.\w+$').all()
    )
)

# Great Expectations integration
@asset
def validated_customer_data(raw_customer_data: pd.DataFrame) -> Output[pd.DataFrame]:
    """Validate customer data with Great Expectations"""
    
    # Create GE dataset
    ge_df = ge.from_pandas(raw_customer_data)
    
    # Define expectations
    ge_df.expect_column_values_to_be_unique('customer_id')
    ge_df.expect_column_values_to_not_be_null('customer_id')
    ge_df.expect_column_values_to_be_between('age', min_value=0, max_value=120)
    ge_df.expect_column_values_to_match_regex(
        'email',
        r'^[\w\.-]+@[\w\.-]+\.\w+$'
    )
    ge_df.expect_column_pair_values_to_be_equal('billing_country', 'shipping_country', mostly=0.95)
    
    # Get validation results
    validation_results = ge_df.validate()
    
    # Convert to Dagster expectations
    expectations = []
    for result in validation_results['results']:
        expectations.append(
            ExpectationResult(
                success=result['success'],
                label=result['expectation_config']['expectation_type'],
                description=str(result['expectation_config']),
                metadata=result.get('result', {})
            )
        )
    
    # Run custom framework checks
    custom_expectations = dq_framework.check_data_quality(
        "customer_data",
        raw_customer_data
    )
    expectations.extend(custom_expectations)
    
    return Output(
        value=raw_customer_data,
        metadata={
            "validation_passed": all(e.success for e in expectations),
            "total_expectations": len(expectations),
            "failed_expectations": sum(1 for e in expectations if not e.success)
        },
        expectation_results=expectations
    )
```

**Lab 3.4.2: Data Lineage and Governance**
```python
from dagster import op, asset, AssetKey, AssetsDefinition
from typing import Set, Dict, List, Tuple
import networkx as nx
from datetime import datetime

class DataGovernanceSystem:
    """System for tracking data lineage and governance"""
    
    def __init__(self):
        self.lineage_graph = nx.DiGraph()
        self.data_catalog = {}
        self.access_policies = {}
        self.audit_log = []
    
    def register_asset(self, asset_key: str, metadata: Dict):
        """Register an asset in the data catalog"""
        self.data_catalog[asset_key] = {
            "metadata": metadata,
            "created_at": datetime.now(),
            "owner": metadata.get("owner", "unknown"),
            "classification": metadata.get("classification", "internal"),
            "retention_days": metadata.get("retention_days", 365)
        }
        
        self.lineage_graph.add_node(asset_key, **metadata)
    
    def add_lineage(self, source: str, target: str, transformation: str = None):
        """Add lineage relationship between assets"""
        self.lineage_graph.add_edge(
            source,
            target,
            transformation=transformation,
            created_at=datetime.now()
        )
    
    def get_upstream_assets(self, asset_key: str) -> Set[str]:
        """Get all upstream dependencies of an asset"""
        return set(nx.ancestors(self.lineage_graph, asset_key))
    
    def get_downstream_impact(self, asset_key: str) -> Set[str]:
        """Get all downstream assets that would be impacted"""
        return set(nx.descendants(self.lineage_graph, asset_key))
    
    def check_access(self, user: str, asset_key: str, action: str) -> bool:
        """Check if user has access to perform action on asset"""
        policy = self.access_policies.get(asset_key, {})
        user_permissions = policy.get(user, [])
        
        # Log access attempt
        self.audit_log.append({
            "timestamp": datetime.now(),
            "user": user,
            "asset": asset_key,
            "action": action,
            "granted": action in user_permissions
        })
        
        return action in user_permissions
    
    def generate_lineage_report(self, asset_key: str) -> Dict:
        """Generate comprehensive lineage report for an asset"""
        upstream = self.get_upstream_assets(asset_key)
        downstream = self.get_downstream_impact(asset_key)
        
        # Get transformation paths
        paths = []
        for source in upstream:
            for path in nx.all_simple_paths(self.lineage_graph, source, asset_key):
                transformations = []
                for i in range(len(path) - 1):
                    edge_data = self.lineage_graph.get_edge_data(path[i], path[i+1])
                    transformations.append(edge_data.get("transformation", "unknown"))
                
                paths.append({
                    "source": source,
                    "path": path,
                    "transformations": transformations
                })
        
        return {
            "asset": asset_key,
            "metadata": self.data_catalog.get(asset_key, {}),
            "upstream_dependencies": list(upstream),
            "downstream_impact": list(downstream),
            "transformation_paths": paths,
            "report_generated": datetime.now().isoformat()
        }

# Initialize governance system
governance = DataGovernanceSystem()

# Governance-aware asset
@asset(
    metadata={
        "owner": "data_team",
        "classification": "sensitive",
        "retention_days": 90
    }
)
def governed_financial_data(context, raw_transactions: pd.DataFrame) -> pd.DataFrame:
    """Process financial data with governance controls"""
    
    # Register in governance system
    governance.register_asset(
        "governed_financial_data",
        context.op.metadata
    )
    
    # Add lineage
    governance.add_lineage(
        "raw_transactions",
        "governed_financial_data",
        "aggregation_and_anonymization"
    )
    
    # Check access
    user = context.run.tags.get("user", "system")
    if not governance.check_access(user, "governed_financial_data", "write"):
        raise PermissionError(f"User {user} not authorized to create financial data")
    
    # Apply data masking for sensitive fields
    processed = raw_transactions.copy()
    
    # Mask account numbers
    processed['account_number'] = processed['account_number'].apply(
        lambda x: f"***{str(x)[-4:]}" if pd.notna(x) else None
    )
    
    # Add governance metadata
    processed['_governance_metadata'] = {
        "processed_by": user,
        "processing_time": datetime.now().isoformat(),
        "data_classification": "sensitive",
        "masking_applied": True
    }
    
    return processed

# Compliance reporting
@op
def generate_compliance_report(context):
    """Generate compliance report for data governance"""
    
    report = {
        "report_date": datetime.now().isoformat(),
        "data_assets": len(governance.data_catalog),
        "sensitive_assets": sum(
            1 for asset in governance.data_catalog.values()
            if asset['classification'] == 'sensitive'
        ),
        "access_violations": sum(
            1 for log in governance.audit_log
            if not log['granted']
        ),
        "retention_compliance": []
    }
    
    # Check retention compliance
    for asset_key, asset_info in governance.data_catalog.items():
        created = asset_info['created_at']
        retention_days = asset_info['retention_days']
        days_old = (datetime.now() - created).days
        
        if days_old > retention_days:
            report['retention_compliance'].append({
                "asset": asset_key,
                "days_over_retention": days_old - retention_days,
                "action_required": "delete_or_archive"
            })
    
    # Generate audit summary
    audit_summary = pd.DataFrame(governance.audit_log)
    if not audit_summary.empty:
        report['audit_summary'] = {
            "total_access_attempts": len(audit_summary),
            "unique_users": audit_summary['user'].nunique(),
            "access_denied_count": sum(~audit_summary['granted']),
            "most_accessed_assets": audit_summary['asset'].value_counts().head(5).to_dict()
        }
    
    return report
```

**Lab 3.4.3: Automated Data Documentation**
```python
from dagster import asset, AssetIn, Output
import inspect
import ast
from typing import Dict, List
import markdown

class DataDocumentationGenerator:
    """Automatically generate documentation for data assets"""
    
    def __init__(self):
        self.documentation = {}
    
    def extract_asset_docs(self, asset_def: AssetsDefinition) -> Dict:
        """Extract documentation from asset definition"""
        
        # Get function source
        source = inspect.getsource(asset_def._asset_fn)
        
        # Parse AST
        tree = ast.parse(source)
        
        # Extract docstring
        docstring = ast.get_docstring(tree)
        
        # Extract metadata
        metadata = asset_def.metadata_by_key.get(
            list(asset_def.keys)[0], 
            {}
        )
        
        # Extract input/output types
        sig = inspect.signature(asset_def._asset_fn)
        params = {}
        for name, param in sig.parameters.items():
            if name not in ['context', 'self']:
                params[name] = {
                    "type": str(param.annotation) if param.annotation else "Any",
                    "required": param.default == param.empty
                }
        
        return {
            "name": asset_def.key.path[-1],
            "description": docstring,
            "metadata": metadata,
            "inputs": params,
            "output_type": str(sig.return_annotation) if sig.return_annotation else "Unknown"
        }
    
    def generate_markdown_docs(self, assets: List[AssetsDefinition]) -> str:
        """Generate markdown documentation for assets"""
        
        doc_parts = ["# Data Asset Documentation\n"]
        doc_parts.append("Auto-generated documentation for data pipeline assets.\n")
        
        # Group by prefix/domain
        grouped = {}
        for asset in assets:
            docs = self.extract_asset_docs(asset)
            prefix = docs['metadata'].get('group', 'default')
            
            if prefix not in grouped:
                grouped[prefix] = []
            grouped[prefix].append(docs)
        
        # Generate docs by group
        for group, group_assets in grouped.items():
            doc_parts.append(f"\n## {group.title()} Domain\n")
            
            for asset_doc in group_assets:
                doc_parts.append(f"\n### {asset_doc['name']}\n")
                
                if asset_doc['description']:
                    doc_parts.append(f"{asset_doc['description']}\n")
                
                # Metadata table
                if asset_doc['metadata']:
                    doc_parts.append("\n**Metadata:**\n")
                    doc_parts.append("| Property | Value |")
                    doc_parts.append("|----------|-------|")
                    for key, value in asset_doc['metadata'].items():
                        doc_parts.append(f"| {key} | {value} |")
                
                # Inputs
                if asset_doc['inputs']:
                    doc_parts.append("\n**Inputs:**\n")
                    for input_name, input_info in asset_doc['inputs'].items():
                        req = "required" if input_info['required'] else "optional"
                        doc_parts.append(f"- `{input_name}` ({input_info['type']}) - {req}")
                
                # Output
                doc_parts.append(f"\n**Output:** `{asset_doc['output_type']}`\n")
        
        # Add lineage diagram placeholder
        doc_parts.append("\n## Data Lineage\n")
        doc_parts.append("```mermaid")
        doc_parts.append("graph LR")
        
        # Generate mermaid lineage
        for asset in assets:
            asset_name = asset.key.path[-1]
            for dep in asset.dependencies:
                dep_name = dep.asset_key.path[-1]
                doc_parts.append(f"    {dep_name} --> {asset_name}")
        
        doc_parts.append("```\n")
        
        return "\n".join(doc_parts)

# Example usage in asset
@asset(
    metadata={
        "owner": "analytics_team",
        "sla": "daily by 6am",
        "group": "revenue"
    },
    description="Calculate daily revenue metrics including MRR, ARR, and churn"
)
def revenue_metrics(daily_transactions: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate key revenue metrics from daily transactions.
    
    This asset computes:
    - Monthly Recurring Revenue (MRR)
    - Annual Recurring Revenue (ARR)
    - Churn rate
    - Customer lifetime value
    
    Data quality checks:
    - All amounts must be positive
    - No duplicate transaction IDs
    - Valid date ranges
    """
    # Implementation here
    pass

# Auto-generate documentation
doc_generator = DataDocumentationGenerator()
documentation = doc_generator.generate_markdown_docs([revenue_metrics])
```

##### Project (2 hours)
Build a data governance system that:
1. Tracks data lineage automatically
2. Enforces quality standards
3. Manages access controls
4. Generates compliance reports

### Module 3.5: Production Operations (10 hours)

#### Overview
Operating Dagster at scale in production environments.

#### Content Outline

##### Theory (2 hours)
- Production deployment patterns
- High availability configurations
- Disaster recovery strategies
- Operational excellence

##### Hands-on Lab (6 hours)

**Lab 3.5.1: Production Monitoring**
```python
from dagster import resource, op, job, run_status_sensor, RunStatusSensorContext
import datadog
from prometheus_client import Counter, Histogram, Gauge, push_to_gateway
import logging
import json

# Metrics collection
pipeline_runs = Counter('dagster_pipeline_runs_total', 'Total pipeline runs', ['job', 'status'])
pipeline_duration = Histogram('dagster_pipeline_duration_seconds', 'Pipeline duration', ['job'])
active_runs = Gauge('dagster_active_runs', 'Currently active runs')
asset_materialization_time = Histogram('dagster_asset_materialization_seconds', 'Asset materialization time', ['asset'])

@resource(
    config_schema={
        "api_key": str,
        "app_key": str,
        "environment": str
    }
)
def datadog_resource(init_context):
    """Datadog monitoring resource"""
    
    config = init_context.resource_config
    datadog.initialize(
        api_key=config["api_key"],
        app_key=config["app_key"]
    )
    
    class DatadogMonitoring:
        def __init__(self, environment):
            self.environment = environment
            self.tags = [f"env:{environment}"]
        
        def record_run_metric(self, job_name: str, duration: float, status: str):
            """Record job run metrics"""
            datadog.statsd.increment(
                'dagster.job.runs',
                tags=self.tags + [f"job:{job_name}", f"status:{status}"]
            )
            
            datadog.statsd.histogram(
                'dagster.job.duration',
                duration,
                tags=self.tags + [f"job:{job_name}"]
            )
            
            # Send event for failures
            if status == "FAILURE":
                datadog.api.Event.create(
                    title=f"Dagster Job Failed: {job_name}",
                    text=f"Job {job_name} failed in {self.environment}",
                    alert_type="error",
                    tags=self.tags + [f"job:{job_name}"]
                )
        
        def record_asset_metric(self, asset_key: str, duration: float, metadata: Dict):
            """Record asset materialization metrics"""
            datadog.statsd.histogram(
                'dagster.asset.materialization_time',
                duration,
                tags=self.tags + [f"asset:{asset_key}"]
            )
            
            # Record custom metrics from metadata
            if "row_count" in metadata:
                datadog.statsd.gauge(
                    'dagster.asset.row_count',
                    metadata["row_count"],
                    tags=self.tags + [f"asset:{asset_key}"]
                )
    
    return DatadogMonitoring(config["environment"])

# Structured logging
class StructuredLogger:
    """JSON structured logging for production"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        handler = logging.StreamHandler()
        handler.setFormatter(self.JsonFormatter())
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    class JsonFormatter(logging.Formatter):
        def format(self, record):
            log_obj = {
                'timestamp': self.formatTime(record),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'run_id': getattr(record, 'run_id', None),
                'job_name': getattr(record, 'job_name', None),
                'asset_key': getattr(record, 'asset_key', None)
            }
            
            if record.exc_info:
                log_obj['exception'] = self.formatException(record.exc_info)
            
            return json.dumps(log_obj)
    
    def with_context(self, **kwargs):
        """Add context to logger"""
        adapter = logging.LoggerAdapter(self.logger, kwargs)
        return adapter

# Production monitoring job wrapper
def production_job(job_def):
    """Decorator to add production monitoring to jobs"""
    
    @run_status_sensor(
        monitored_job=job_def,
        run_status=DagsterRunStatus.SUCCESS
    )
    def success_sensor(context: RunStatusSensorContext):
        # Record success metrics
        pipeline_runs.labels(
            job=context.dagster_run.job_name,
            status="success"
        ).inc()
        
        duration = (
            context.dagster_run.end_time - 
            context.dagster_run.start_time
        ).total_seconds()
        
        pipeline_duration.labels(
            job=context.dagster_run.job_name
        ).observe(duration)
    
    @run_status_sensor(
        monitored_job=job_def,
        run_status=DagsterRunStatus.FAILURE
    )
    def failure_sensor(context: RunStatusSensorContext):
        # Record failure metrics
        pipeline_runs.labels(
            job=context.dagster_run.job_name,
            status="failure"
        ).inc()
        
        # Alert on failure
        send_alert(
            title=f"Job Failed: {context.dagster_run.job_name}",
            message=f"Run ID: {context.dagster_run.run_id}",
            severity="high"
        )
    
    return job_def
```

**Lab 3.5.2: High Availability Setup**
```python
# PostgreSQL configuration for HA
"""
-- Primary-replica setup for Dagster storage
-- Primary database configuration
CREATE DATABASE dagster_primary;

-- Enable replication
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET wal_keep_segments = 64;

-- Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secure_password';

-- On replica:
-- recovery.conf
standby_mode = 'on'
primary_conninfo = 'host=primary_host port=5432 user=replicator'
"""

# Kubernetes HA deployment
"""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dagster-daemon
  namespace: dagster
spec:
  replicas: 3  # Multiple daemons for HA
  selector:
    matchLabels:
      app: dagster-daemon
  template:
    metadata:
      labels:
        app: dagster-daemon
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - dagster-daemon
            topologyKey: kubernetes.io/hostname
      containers:
      - name: daemon
        image: dagster:latest
        command: ["dagster-daemon", "run"]
        env:
        - name: DAGSTER_POSTGRES_HOST
          value: "postgres-primary"
        - name: DAGSTER_DAEMON_HEARTBEAT_INTERVAL
          value: "30"
        livenessProbe:
          exec:
            command:
            - dagster-daemon
            - health-check
          initialDelaySeconds: 60
          periodSeconds: 30
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
"""

# Load balancer configuration
from dagster import Field, String, IntSource

def create_ha_postgres_config():
    """Create HA PostgreSQL configuration with connection pooling"""
    return {
        "postgres_storage": {
            "config": {
                "postgres_url": {
                    "env": "DAGSTER_POSTGRES_URL"
                },
                "pool_size": 20,
                "max_overflow": 40,
                "pool_pre_ping": True,
                "pool_recycle": 3600,
                "connect_args": {
                    "keepalives": 1,
                    "keepalives_idle": 30,
                    "keepalives_interval": 10,
                    "keepalives_count": 5,
                    "connect_timeout": 10,
                    "target_session_attrs": "read-write"
                }
            }
        }
    }

# Health check endpoint
from flask import Flask, jsonify
import psycopg2

health_app = Flask(__name__)

@health_app.route('/health')
def health_check():
    """Comprehensive health check endpoint"""
    health_status = {
        "status": "healthy",
        "checks": {}
    }
    
    # Check database connectivity
    try:
        conn = psycopg2.connect(os.environ['DAGSTER_POSTGRES_URL'])
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        health_status["checks"]["database"] = "ok"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = str(e)
    
    # Check daemon status
    try:
        # Check if daemon is running
        instance = DagsterInstance.get()
        daemon_status = instance.get_daemon_statuses()
        
        for status in daemon_status:
            health_status["checks"][f"daemon_{status.daemon_type}"] = (
                "ok" if status.healthy else "unhealthy"
            )
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["daemon"] = str(e)
    
    status_code = 200 if health_status["status"] == "healthy" else 503
    return jsonify(health_status), status_code
```

**Lab 3.5.3: Disaster Recovery**
```python
import boto3
from dagster import op, job, schedule
import subprocess
import os

class DisasterRecoveryManager:
    """Manage backup and recovery operations"""
    
    def __init__(self, s3_bucket: str, postgres_url: str):
        self.s3_client = boto3.client('s3')
        self.s3_bucket = s3_bucket
        self.postgres_url = postgres_url
    
    def backup_database(self, backup_name: str):
        """Backup Dagster database to S3"""
        
        # Create database dump
        dump_file = f"/tmp/{backup_name}.sql"
        
        subprocess.run([
            "pg_dump",
            self.postgres_url,
            "-f", dump_file,
            "--verbose",
            "--no-owner",
            "--no-privileges"
        ], check=True)
        
        # Compress backup
        compressed_file = f"{dump_file}.gz"
        subprocess.run([
            "gzip", dump_file
        ], check=True)
        
        # Upload to S3
        with open(compressed_file, 'rb') as f:
            self.s3_client.upload_fileobj(
                f,
                self.s3_bucket,
                f"dagster-backups/{backup_name}.sql.gz",
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'StorageClass': 'STANDARD_IA'
                }
            )
        
        # Clean up local files
        os.remove(compressed_file)
        
        return f"s3://{self.s3_bucket}/dagster-backups/{backup_name}.sql.gz"
    
    def restore_database(self, backup_name: str, target_url: str):
        """Restore database from S3 backup"""
        
        # Download from S3
        compressed_file = f"/tmp/{backup_name}.sql.gz"
        self.s3_client.download_file(
            self.s3_bucket,
            f"dagster-backups/{backup_name}.sql.gz",
            compressed_file
        )
        
        # Decompress
        subprocess.run([
            "gunzip", compressed_file
        ], check=True)
        
        # Restore database
        dump_file = compressed_file[:-3]  # Remove .gz
        subprocess.run([
            "psql",
            target_url,
            "-f", dump_file
        ], check=True)
        
        # Clean up
        os.remove(dump_file)
    
    def backup_run_storage(self, run_id: str):
        """Backup run artifacts to S3"""
        
        instance = DagsterInstance.get()
        run = instance.get_run_by_id(run_id)
        
        if not run:
            raise ValueError(f"Run {run_id} not found")
        
        # Backup run data
        run_data = {
            "run": run,
            "logs": list(instance.get_logs_for_run(run_id)),
            "events": list(instance.get_event_records(
                EventRecordsFilter(run_ids=[run_id])
            ))
        }
        
        # Serialize and upload
        key = f"run-backups/{run_id}/run_data.json"
        self.s3_client.put_object(
            Bucket=self.s3_bucket,
            Key=key,
            Body=json.dumps(run_data, default=str),
            ServerSideEncryption='AES256'
        )
        
        return f"s3://{self.s3_bucket}/{key}"

# Backup job
@job
def disaster_recovery_backup_job():
    @op
    def create_database_backup(context):
        dr_manager = DisasterRecoveryManager(
            s3_bucket="dagster-dr-bucket",
            postgres_url=os.environ['DAGSTER_POSTGRES_URL']
        )
        
        backup_name = f"dagster_backup_{context.run_id}_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path = dr_manager.backup_database(backup_name)
        
        context.log.info(f"Database backed up to {backup_path}")
        
        return backup_path
    
    create_database_backup()

# Schedule daily backups
@schedule(
    cron_schedule="0 2 * * *",  # 2 AM daily
    job=disaster_recovery_backup_job,
    execution_timezone="UTC"
)
def daily_backup_schedule(context):
    return {}

# Recovery runbook
"""
# Dagster Disaster Recovery Runbook

## Scenario 1: Database Corruption
1. Stop all Dagster services
   ```bash
   kubectl scale deployment dagster-daemon --replicas=0
   kubectl scale deployment dagster-webserver --replicas=0
   ```

2. Restore from latest backup
   ```python
   dr_manager = DisasterRecoveryManager(
       s3_bucket="dagster-dr-bucket",
       postgres_url="postgresql://restore_user@restore_host/dagster"
   )
   dr_manager.restore_database("dagster_backup_20240115_020000", target_url)
   ```

3. Verify restoration
   ```sql
   SELECT COUNT(*) FROM runs;
   SELECT COUNT(*) FROM event_logs;
   ```

4. Restart services
   ```bash
   kubectl scale deployment dagster-daemon --replicas=3
   kubectl scale deployment dagster-webserver --replicas=2
   ```

## Scenario 2: Regional Outage
1. Failover to DR region
2. Update DNS records
3. Verify data replication lag
4. Resume operations

## Scenario 3: Data Corruption
1. Identify affected assets
2. Restore from asset-level backups
3. Re-materialize downstream assets
4. Validate data quality
"""
```

##### Capstone Project (2 hours)
Design and implement a production-ready deployment that includes:
1. Multi-region high availability
2. Automated monitoring and alerting
3. Disaster recovery procedures
4. Performance optimization

### Module 3.6: Advanced Patterns and Future Directions (12 hours)

#### Overview
Cutting-edge patterns and emerging trends in data orchestration.

#### Content Outline

##### Theory (3 hours)
- Event-driven architectures
- Real-time streaming integration
- Machine learning pipelines
- Future of data orchestration

##### Hands-on Lab (7 hours)

**Lab 3.6.1: Real-time Streaming Integration**
```python
from dagster import op, job, asset, sensor
from kafka import KafkaConsumer, KafkaProducer
from typing import Iterator
import apache_beam as beam
import pandas as pd

class StreamingAsset:
    """Base class for streaming assets"""
    
    def __init__(self, asset_key: str, window_size_seconds: int = 60):
        self.asset_key = asset_key
        self.window_size = window_size_seconds
        self.buffer = []
        self.last_materialization = pd.Timestamp.now()
    
    def process_event(self, event: Dict):
        """Process incoming event"""
        self.buffer.append(event)
        
        # Check if window has elapsed
        if (pd.Timestamp.now() - self.last_materialization).seconds >= self.window_size:
            return self.materialize_window()
        
        return None
    
    def materialize_window(self):
        """Materialize buffered events"""
        if not self.buffer:
            return None
        
        df = pd.DataFrame(self.buffer)
        self.buffer = []
        self.last_materialization = pd.Timestamp.now()
        
        return df

@asset
def streaming_aggregations(context) -> Iterator[Output]:
    """Continuously aggregate streaming data"""
    
    consumer = KafkaConsumer(
        'events-stream',
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    
    streaming_asset = StreamingAsset(
        "streaming_aggregations",
        window_size_seconds=30
    )
    
    try:
        for message in consumer:
            event = message.value
            
            # Process event
            result = streaming_asset.process_event(event)
            
            if result is not None:
                # Window completed, yield materialization
                yield Output(
                    value=result,
                    metadata={
                        "window_size": streaming_asset.window_size,
                        "events_processed": len(result),
                        "window_end": pd.Timestamp.now().isoformat()
                    }
                )
    finally:
        consumer.close()

# Apache Beam integration
@op
def beam_streaming_pipeline(context):
    """Run Apache Beam streaming pipeline"""
    
    class AggregateEvents(beam.DoFn):
        def process(self, element, window=beam.DoFn.WindowParam):
            # Aggregate logic
            yield {
                'window': window,
                'count': len(element),
                'sum': sum(e['value'] for e in element)
            }
    
    with beam.Pipeline() as pipeline:
        (
            pipeline
            | 'ReadFromKafka' >> beam.io.ReadFromKafka(
                consumer_config={'bootstrap.servers': 'localhost:9092'},
                topics=['events']
            )
            | 'Window' >> beam.WindowInto(
                beam.window.FixedWindows(60)  # 60-second windows
            )
            | 'GroupByKey' >> beam.GroupByKey()
            | 'Aggregate' >> beam.ParDo(AggregateEvents())
            | 'WriteToDatabase' >> beam.io.WriteToBigQuery(
                table='project:dataset.aggregated_events',
                schema='window:TIMESTAMP,count:INTEGER,sum:FLOAT'
            )
        )