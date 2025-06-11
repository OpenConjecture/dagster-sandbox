---
title: Introduction to Dagster
type: theory
estimatedMinutes: 30
---

# Welcome to Dagster

Dagster is a cloud-native data orchestration platform that helps you build, run, and monitor data pipelines. Unlike traditional workflow orchestrators, Dagster introduces a unique approach centered around **Software-Defined Assets**.

## What Makes Dagster Different?

### 1. Asset-Centric Approach
Traditional orchestrators focus on tasks and their dependencies. Dagster flips this model by focusing on the **data assets** your pipelines produce.

```python
@asset
def raw_customers():
    """Load raw customer data from source"""
    return pd.read_csv("customers.csv")

@asset
def cleaned_customers(raw_customers):
    """Clean and validate customer data"""
    return raw_customers.dropna()
```

### 2. Development Experience
Dagster provides excellent developer tooling:
- **Dagit**: A powerful web UI for exploring and monitoring pipelines
- **Type System**: Built-in type checking for data flowing through pipelines
- **Testing**: First-class support for unit testing your pipeline logic

### 3. Declarative Configuration
Define your pipelines as code with clear separation of business logic and infrastructure:

```python
from dagster import job, op

@op
def get_data():
    return [1, 2, 3, 4, 5]

@op
def process_data(data):
    return [x * 2 for x in data]

@job
def my_pipeline():
    process_data(get_data())
```

## Core Philosophy

Dagster is built on three key principles:

1. **Declarative**: Define what your pipeline should do, not how to execute it
2. **Testable**: Every component can be tested in isolation
3. **Observable**: Built-in monitoring and observability from day one

## What You'll Learn

In this module, you'll:
- Understand Dagster's core concepts
- Build your first pipeline
- Learn about assets, ops, and jobs
- Explore Dagster's development tools

Let's dive into the core concepts that make Dagster powerful!