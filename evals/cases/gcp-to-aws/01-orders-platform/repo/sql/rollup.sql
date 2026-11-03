CREATE OR REPLACE TABLE analytics.daily AS
SELECT DATE(TIMESTAMP_TRUNC(created_at, DAY)) AS day,
       customer_id,
       SUM(SAFE_CAST(amount AS NUMERIC)) AS amount,
       ARRAY_AGG(STRUCT(sku, qty) ORDER BY qty DESC LIMIT 3) AS top_items,
       APPROX_COUNT_DISTINCT(session_id) AS sessions
FROM `analytics.orders`, UNNEST(items)
WHERE _PARTITIONDATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
GROUP BY 1, 2
QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) <= 100;
