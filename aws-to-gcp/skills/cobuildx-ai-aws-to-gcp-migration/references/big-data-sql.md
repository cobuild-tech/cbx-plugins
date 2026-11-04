# Redshift / Athena SQL → BigQuery (GoogleSQL)

The BigQuery SQL translator converts much of the SQL (Redshift and
Presto/Trino dialects). Treat its output as a first draft and check the
items below by hand.

## Dialect map

| Redshift | Athena (Trino) | BigQuery |
|---|---|---|
| `database.schema.table` | `catalog.database.table` | `` `project.dataset.table` `` |
| `"quoted"` identifiers | `"quoted"` identifiers | `` `backticks` `` (double quotes are string literals) |
| `x::INT`, `CAST(x AS INT)` | `CAST(x AS integer)` | `CAST(x AS INT64)` |
| `CAST` on bad data errors | `TRY_CAST(x AS T)` | `SAFE_CAST(x AS T)` |
| `NVL(a, b)`, `ISNULL` | `COALESCE(a, b)` | `IFNULL(a, b)` or `COALESCE` |
| `NVL2(x, a, b)` | `IF(x IS NOT NULL, a, b)` | `IF(x IS NOT NULL, a, b)` |
| `DECODE(x, a, r1, r2)` | `CASE` | `CASE` |
| `GETDATE()`, `SYSDATE` | `current_timestamp` | `CURRENT_DATETIME()` (no zone) or `CURRENT_TIMESTAMP()` |
| `CURRENT_DATE` | `current_date` | `CURRENT_DATE()` (UTC unless a zone is given) |
| `TRUNC(ts)`, `ts::DATE` | `CAST(ts AS DATE)` | `DATE(ts)` |
| `DATE_TRUNC('month', d)` | `date_trunc('month', d)` | `DATE_TRUNC(d, MONTH)` / `TIMESTAMP_TRUNC` |
| `DATEADD(day, 7, d)` | `date_add('day', 7, d)` | `DATE_ADD(d, INTERVAL 7 DAY)` |
| `DATEDIFF(day, a, b)` | `date_diff('day', a, b)` | `DATE_DIFF(b, a, DAY)` (argument order flips) |
| `TO_CHAR(d, 'YYYY-MM')` | `date_format(d, '%Y-%m')` | `FORMAT_DATE('%Y-%m', d)` / `FORMAT_TIMESTAMP` |
| `CONVERT_TIMEZONE('UTC', 'America/New_York', ts)` | `ts AT TIME ZONE 'America/New_York'` | `DATETIME(ts, 'America/New_York')` |
| `LISTAGG(x, ',') WITHIN GROUP (ORDER BY y)` | `array_join(array_agg(x ORDER BY y), ',')` | `STRING_AGG(x, ',' ORDER BY y)` |
| `APPROXIMATE COUNT(DISTINCT x)` | `approx_distinct(x)` | `APPROX_COUNT_DISTINCT(x)` |
| `ILIKE` | `lower(s) LIKE lower(p)` | `LOWER(s) LIKE LOWER(p)` |
| `s ~ r`, `REGEXP_INSTR` | `regexp_like(s, r)` | `REGEXP_CONTAINS(s, r)` |
| `SUPER` + PartiQL (`o.items[0].sku`) | `ROW`, `ARRAY`, `json_extract` | `JSON` (`JSON_VALUE`, `o.items[0].sku`) or `STRUCT`/`ARRAY` |
| `FROM t AS o, o.arr AS x` | `CROSS JOIN UNNEST(arr) AS t(x)` | `CROSS JOIN UNNEST(o.arr) AS x` |
| `QUALIFY` | not supported (subquery) | supported (needs a `WHERE`, `GROUP BY`, or `HAVING` in the query) |
| `TOP n` | `LIMIT n` | `LIMIT n` |
| `VARCHAR(n)` (bytes) | `varchar` | `STRING` (characters; `STRING(n)` only enforces a max) |
| `DECIMAL(p,s)` | `decimal(p,s)` | `NUMERIC` (38,9) or `BIGNUMERIC`; parameterized `NUMERIC(p,s)` |
| `DOUBLE PRECISION`, `REAL` | `double`, `real` | `FLOAT64` |
| `SMALLINT`, `INT`, `BIGINT` | `smallint`, `integer`, `bigint` | `INT64` |
| `TIMESTAMP` (no zone) | `timestamp` | `DATETIME` |
| `TIMESTAMPTZ` | `timestamp with time zone` | `TIMESTAMP` (absolute instant, displayed UTC) |
| `DISTKEY`, `SORTKEY`, `DISTSTYLE`, `ENCODE` | partitioned by / bucketed by | `PARTITION BY`, `CLUSTER BY`; drop encodings |
| Stored procedures (PL/pgSQL) | not supported | BigQuery procedures and scripting (rewrite) |
| `UNLOAD`, `COPY` | `CTAS` to S3 | `EXPORT DATA`, `LOAD DATA` |
| Late-binding views (`WITH NO SCHEMA BINDING`) | views | views (schema checked at query time) |

## Example

```sql
-- Redshift (items is SUPER)
SELECT o.order_id, item.price::DECIMAL(18,2) AS price,
       DATEDIFF(day, o.created_at, GETDATE()) AS age_days
FROM sales.orders AS o, o.items AS item
WHERE TRUNC(o.created_at) = CURRENT_DATE;

-- BigQuery (items is ARRAY<STRUCT<...>>; created_at is DATETIME holding UTC)
SELECT o.order_id, CAST(item.price AS NUMERIC) AS price,
       DATE_DIFF(CURRENT_DATETIME(), o.created_at, DAY) AS age_days
FROM `shop-prod.sales.orders` AS o CROSS JOIN UNNEST(o.items) AS item
WHERE DATE(o.created_at) = CURRENT_DATE();
```

`DATE_DIFF` on `DATETIME` counts day boundaries crossed, like Redshift
`DATEDIFF`. If reports expected a local day, the Redshift code used
`CONVERT_TIMEZONE`; carry that zone into `CURRENT_DATE('America/New_York')`
and `DATE(ts, 'America/New_York')`.

## Traps

- **Time zones.** Redshift `TIMESTAMP` has no zone; BigQuery `TIMESTAMP`
  is an instant. Load zone-less columns as `DATETIME` unless you are sure
  they hold UTC. Off-by-one-day totals at month end are the usual symptom.
  Redshift `GETDATE()` returns the session time (UTC by default).
- **Integer division.** Redshift and Trino `int / int` truncate. BigQuery
  `/` always returns `FLOAT64`. Use `DIV(x, y)` where truncation was
  intended, and `SAFE_DIVIDE` where `NULLIF` guarded zero.
- **Case sensitivity.** Redshift folds unquoted identifiers to lower case
  and compares strings case-sensitively. BigQuery column names are
  case-insensitive, table names case-sensitive by default; string
  comparisons are case-sensitive. Check `GROUP BY` and joins on text.
- **NULL ordering.** Redshift sorts NULLs last ascending; BigQuery sorts
  NULLs first ascending. Add `NULLS LAST` where results are ordered.
- **Empty string vs NULL.** Check `NVL`, `COALESCE`, and `''` comparisons
  on loaded data.
- **Precision.** `DECIMAL(38, s)` with `s > 9` needs `BIGNUMERIC` or a
  parameterized `NUMERIC`. Flag those columns.
- **`SELECT DISTINCT` on `SUPER`/JSON.** BigQuery can't group or
  `DISTINCT` on `JSON`; extract the fields first.
- **Partition columns.** Athena Hive-style partitions (`dt='2026-01-01'`
  as strings) → a real `DATE` partition column. Rewrite the filters.

## Validation rule

Test the top 50 queries (top dashboards, finance reports, ML features)
row by row against Redshift or Athena on the same snapshot. Fix the long
tail as people use it. Record each query's result in the unit file.

## Keep partition filters the same type

Hive-style lake partitions (`dt='2026-10-29'`) are strings. In BigQuery
over BigLake/external tables they stay `STRING` unless you redefine the
table, so keep the comparison a string:
`dt >= FORMAT_DATE('%Y-%m-%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))`.
Change it to a `DATE` comparison only when the target table's partition
column is really `DATE` (native table you define in the same change), and
say so.

