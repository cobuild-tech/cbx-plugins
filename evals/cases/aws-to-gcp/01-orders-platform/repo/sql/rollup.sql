CREATE TABLE analytics.daily AS
SELECT day, customer_id, amount, top_skus, sessions FROM (
  SELECT date_trunc('day', o.created_at) AS day,
         o.customer_id,
         SUM(TRY_CAST(o.amount AS DECIMAL(18,2))) AS amount,
         slice(array_agg(i.sku ORDER BY i.qty DESC), 1, 3) AS top_skus,
         approx_distinct(o.session_id) AS sessions,
         ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY SUM(TRY_CAST(o.amount AS DECIMAL(18,2))) DESC) AS rn
  FROM analytics.orders o
  CROSS JOIN UNNEST(o.items) AS t(i)
  WHERE o.dt >= date_format(date_add('day', -1, current_date), '%Y-%m-%d')
  GROUP BY 1, 2
) WHERE rn <= 100;
