import json
import os

from dagster_duckdb import DuckDBResource

import dagster as dg

#
# [1] Asset - Products
#

@dg.asset(
    compute_kind="duckdb",
    group_name="ingestion",
)
def products(duckdb: DuckDBResource) -> dg.MaterializeResult:
    with duckdb.get_connection() as conn:
        conn.execute(
            """
            create or replace table products as (
                select * from read_csv_auto('data/products.csv')
            )
            """
        )

        preview_query = "select * from products limit 10"
        preview_df = conn.execute(preview_query).fetchdf()
        row_count = conn.execute("select count(*) from products").fetchone()
        count = row_count[0] if row_count else 0

        return dg.MaterializeResult(
            metadata={
                "row_count": dg.MetadataValue.int(count),
                "preview": dg.MetadataValue.md(preview_df.to_markdown(index=False)),
            }
        )

#
# [2] Asset - Sales Reps
#

@dg.asset(
    compute_kind="duckdb",
    group_name="ingestion",
)
def sales_reps(duckdb: DuckDBResource) -> dg.MaterializeResult:
    with duckdb.get_connection() as conn:
        conn.execute(
            """
            create or replace table sales_reps as (
                select * from read_csv_auto('data/sales_reps.csv')
            )
            """
        )

        preview_query = "select * from sales_reps limit 10"
        preview_df = conn.execute(preview_query).fetchdf()
        row_count = conn.execute("select count(*) from sales_reps").fetchone()
        count = row_count[0] if row_count else 0

        return dg.MaterializeResult(
            metadata={
                "row_count": dg.MetadataValue.int(count),
                "preview": dg.MetadataValue.md(preview_df.to_markdown(index=False)),
            }
        )

#
# [3] Asset - Sales Data
#

@dg.asset(
    compute_kind="duckdb",
    group_name="ingestion",
)
def sales_data(duckdb: DuckDBResource) -> dg.MaterializeResult:
    with duckdb.get_connection() as conn:
        conn.execute(
            """
            drop table if exists sales_data;
            create table sales_data as select * from read_csv_auto('data/sales_data.csv')
            """
        )

        preview_query = "SELECT * FROM sales_data LIMIT 10"
        preview_df = conn.execute(preview_query).fetchdf()
        row_count = conn.execute("select count(*) from sales_data").fetchone()
        count = row_count[0] if row_count else 0

        return dg.MaterializeResult(
            metadata={
                "row_count": dg.MetadataValue.int(count),
                "preview": dg.MetadataValue.md(preview_df.to_markdown(index=False)),
            }
        )

# Define local path to resources
defs = dg.Definitions(
    assets=[products,
        sales_reps,
        sales_data,
    ],
    resources={"duckdb": DuckDBResource(database="data/mydb.duckdb")},
)