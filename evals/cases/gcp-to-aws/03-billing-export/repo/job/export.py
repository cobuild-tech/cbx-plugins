"""Monthly invoice export. Runs as 16 tasks, 4 at a time; each task exports one shard of accounts."""
import csv
import io
import os

import redis
import requests
from google.cloud import bigquery, storage

TASK_INDEX = int(os.environ.get("CLOUD_RUN_TASK_INDEX", 0))
TASK_COUNT = int(os.environ.get("CLOUD_RUN_TASK_COUNT", 1))
ATTEMPT = int(os.environ.get("CLOUD_RUN_TASK_ATTEMPT", 0))

r = redis.Redis(host=os.environ["REDIS_HOST"], port=6378, ssl=True, password=os.environ.get("REDIS_AUTH"))
bq = bigquery.Client()
gcs = storage.Client()


def main():
    sql = open(os.path.join(os.path.dirname(__file__), "..", "sql", "invoices.sql")).read()
    job = bq.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("shard", "INT64", TASK_INDEX),
                bigquery.ScalarQueryParameter("shards", "INT64", TASK_COUNT),
            ]
        ),
    )
    buf = io.StringIO()
    w = csv.writer(buf)
    for row in job.result():
        # Skip invoices already pushed by an earlier attempt of this task.
        if not r.set(f"invoice:{row.invoice_id}", ATTEMPT, nx=True, ex=40 * 86400):
            continue
        requests.post(
            "https://partner.example.com/v1/invoices",
            json=dict(row.items()),
            headers={"X-Api-Key": os.environ["PARTNER_API_KEY"]},
            timeout=30,
        ).raise_for_status()
        w.writerow(row.values())

    blob = gcs.bucket(os.environ["EXPORT_BUCKET"]).blob(f"invoices/shard-{TASK_INDEX:02d}.csv")
    blob.upload_from_string(buf.getvalue(), content_type="text/csv", if_generation_match=0)


if __name__ == "__main__":
    main()
