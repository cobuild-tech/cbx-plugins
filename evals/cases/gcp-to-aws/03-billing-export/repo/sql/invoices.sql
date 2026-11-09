-- Invoices for last calendar month (Berlin time), as they were at the end of the month.
DECLARE month_start DATE DEFAULT DATE_TRUNC(DATE_SUB(CURRENT_DATE("Europe/Berlin"), INTERVAL 1 MONTH), MONTH);

MERGE billing.invoice_snapshots AS s
USING (
  SELECT invoice_id, account_id, amount_cents, currency, status, updated_at
  FROM billing.invoices FOR SYSTEM_TIME AS OF TIMESTAMP(DATE_ADD(month_start, INTERVAL 1 MONTH), "Europe/Berlin")
  WHERE DATE(issued_at, "Europe/Berlin") >= month_start
    AND DATE(issued_at, "Europe/Berlin") < DATE_ADD(month_start, INTERVAL 1 MONTH)
) AS i
ON s.invoice_id = i.invoice_id
WHEN MATCHED THEN UPDATE SET status = i.status, amount_cents = i.amount_cents, updated_at = i.updated_at
WHEN NOT MATCHED THEN INSERT ROW;

SELECT invoice_id, account_id, amount_cents, currency, status
FROM billing.invoice_snapshots
WHERE MOD(ABS(FARM_FINGERPRINT(account_id)), @shards) = @shard
  AND DATE(updated_at, "Europe/Berlin") >= month_start;
