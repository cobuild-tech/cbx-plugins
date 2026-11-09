-- Weekly editor report. Weeks run Sunday to Saturday, as the editors' schedule does.
SELECT
  DATE_TRUNC(DATE(uploaded_at), WEEK) AS week_start,
  uploader,
  COUNT(*) AS uploads,
  SAFE_DIVIDE(SUM(transcode_seconds), COUNT(*)) AS avg_transcode_s,
  COUNTIF(EXTRACT(DAYOFWEEK FROM uploaded_at) IN (1, 7)) AS weekend_uploads
FROM media.uploads
WHERE uploaded_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 56 DAY)
GROUP BY week_start, uploader
ORDER BY week_start DESC, uploads DESC;
