# BigQuery SQL → Redshift / Athena

AWS SCT converts much of the SQL. Treat its output as a first draft and
check the items below by hand.

## Dialect map

| BigQuery | Redshift | Athena (Trino) |
|---|---|---|
| `project.dataset.table` | `database.schema.table` | `catalog.database.table` |
| `STRUCT`, `ARRAY` | `SUPER` (PartiQL navigation) | `ROW`, `ARRAY` |
| `UNNEST(arr) AS x` | `FROM t AS o, o.arr AS x` | `CROSS JOIN UNNEST(arr) AS t(x)` |
| `SAFE_CAST(x AS T)` | `CAST` (fails on bad data; guard with `CASE`/regex) | `TRY_CAST(x AS T)` |
| `IFNULL(a, b)` | `NVL(a, b)` or `COALESCE` | `COALESCE(a, b)` |
| `CURRENT_DATE()` | `CURRENT_DATE` | `current_date` |
| `DATE(ts)` | `TRUNC(ts)` or `ts::DATE` | `CAST(ts AS DATE)` |
| `TIMESTAMP` (always UTC) | `TIMESTAMPTZ` (or `TIMESTAMP` with no zone) | `timestamp(6) with time zone` |
| `DATE_TRUNC(d, MONTH)` | `DATE_TRUNC('month', d)` | `date_trunc('month', d)` |
| `FORMAT_DATE('%Y-%m', d)` | `TO_CHAR(d, 'YYYY-MM')` | `date_format(d, '%Y-%m')` |
| `REGEXP_CONTAINS(s, r)` | `s ~ r` or `REGEXP_INSTR(s, r) > 0` | `regexp_like(s, r)` |
| `STRING_AGG(x, ',')` | `LISTAGG(x, ',')` | `array_join(array_agg(x), ',')` |
| `ARRAY_AGG(x)` | not supported (aggregate into `SUPER` with `JSON_PARSE`/`LISTAGG`) | `array_agg(x)` |
| `QUALIFY` | supported | not supported (wrap in a subquery) |
| `EXCEPT(col)` in `SELECT *` | not supported (list columns) | not supported |
| `INT64`, `FLOAT64`, `NUMERIC`, `BIGNUMERIC` | `BIGINT`, `DOUBLE PRECISION`, `DECIMAL(38,9)`, `DECIMAL(38,…)` (max precision 38) | `bigint`, `double`, `decimal(38,9)` |
| `STRING` | `VARCHAR(n)` (max 65,535 bytes) | `varchar` |
| Partitioning, clustering | Sort keys, distribution keys | Partitions + Iceberg sort order |
| Scripting, procedures | Stored procedures (PL/pgSQL) | Not supported (move logic to Airflow or Glue) |
| Scheduled queries | Redshift query scheduler or Airflow | EventBridge Scheduler or Airflow |
| `ML.PREDICT` | Redshift ML function | SageMaker endpoint via UDF |

## Example

```sql
-- BigQuery
SELECT o.order_id, SAFE_CAST(item.price AS NUMERIC) AS price
FROM `shop-prod.sales.orders` AS o, UNNEST(o.items) AS item
WHERE DATE(o.created_at) = CURRENT_DATE();

-- Redshift (items is SUPER)
SELECT o.order_id, item.price::DECIMAL(18,2) AS price
FROM sales.orders AS o, o.items AS item
WHERE TRUNC(o.created_at) = CURRENT_DATE;
```

`TRUNC(created_at)` returns the date in the column's stored zone. If
`created_at` is `TIMESTAMP` (no zone) holding UTC, the result matches
BigQuery's `DATE()` (which uses UTC). If reports expect a local day,
BigQuery code used `DATE(ts, 'America/New_York')`; carry that zone into
`CONVERT_TIMEZONE`.

## Traps

- **Time zones.** Load BigQuery `TIMESTAMP` into `TIMESTAMPTZ`, or into
  `TIMESTAMP` with an agreed UTC convention, and check date filters in the
  top reports. Off-by-one-day totals at month end are the usual symptom.
- **Integer division.** BigQuery `/` always returns `FLOAT64`. Redshift and
  Trino integer `/` integer truncates. Use `SAFE_DIVIDE` → `x::FLOAT / NULLIF(y, 0)`.
- **NULL ordering and string comparison.** Check `ORDER BY` with NULLs and
  case sensitivity in `GROUP BY`/joins on text.
- **Precision.** `BIGNUMERIC` beyond 38 digits doesn't fit Redshift
  `DECIMAL`. Flag those columns.
- **Wildcard tables** (`events_*` with `_TABLE_SUFFIX`) → one partitioned
  table, or a `UNION ALL` view.

## Validation rule

Test the top 50 queries (top dashboards, finance reports, ML features)
row by row against BigQuery on the same snapshot. Fix the long tail as
people use it. Record each query's result in the unit file.
