# Interactive Learning Demo

This section demonstrates the new interactive learning features in Phase 2.

## Code Blocks with Syntax Highlighting

Here's a basic Dagster asset with enhanced syntax highlighting and copy functionality:

<CodeBlock language="python" filename="my_asset.py">
from dagster import asset

@asset
def my_data():
    """A simple asset that returns some data."""
    return {"hello": "world", "count": 42}

@asset
def processed_data(my_data):
    """Process the data from my_data asset."""
    return {
        "message": my_data["hello"],
        "doubled_count": my_data["count"] * 2
    }
</CodeBlock>

## Interactive Callouts

<Callout type="info">
This is an informational callout. It provides additional context that might be helpful but isn't critical to understanding the main content.
</Callout>

<Callout type="warning">
Be careful! This is a warning callout. It highlights important considerations or potential pitfalls.
</Callout>

<Callout type="tip">
Pro tip! This is a tip callout. It provides helpful suggestions or best practices.
</Callout>

<Callout type="error">
Error! This is an error callout. It explains common mistakes or issues you might encounter.
</Callout>

## Quick Knowledge Checks

<QuickCheck 
  question="What decorator is used to define a Dagster asset?" 
  answer="The @asset decorator is used to define Dagster assets. It tells Dagster that this function produces a data asset."
/>

<QuickCheck 
  question="Can one asset depend on another asset?" 
  answer="Yes! Assets can depend on other assets by including them as function parameters. Dagster will automatically handle the dependency graph and execution order."
/>

## Collapsible Content

<Collapsible title="Advanced: Asset Dependencies">
When you define an asset that depends on another asset, Dagster automatically:

1. Determines the execution order
2. Passes the output of upstream assets as inputs
3. Handles caching and recomputation
4. Provides lineage tracking

This makes it easy to build complex data pipelines with clear dependencies.
</Collapsible>

<Collapsible title="Code Example: Multiple Dependencies">
<CodeBlock language="python">
@asset
def raw_data():
    return fetch_data_from_api()

@asset  
def cleaned_data(raw_data):
    return clean(raw_data)

@asset
def aggregated_data(cleaned_data):
    return aggregate(cleaned_data)

@asset
def final_report(cleaned_data, aggregated_data):
    return generate_report(cleaned_data, aggregated_data)
</CodeBlock>
</Collapsible>

## Navigation

You can navigate between sections using the enhanced navigation buttons:

<NavigationButtons 
  nextLabel="Continue to Quiz"
  previousLabel="Back to Core Concepts"
/>

---

This concludes the interactive learning demo. Try out the different components to see how they enhance the learning experience!