# Big data: BigQuery, Dataproc, Dataflow, Pub/Sub, Composer

The services map easily. The SQL, pricing, and message semantics differ in
small ways. Move the data carefully, prove the numbers match, then switch
readers one at a time. For SQL conversion read `big-data-sql.md`.

## Decide in order (stop at the first yes)

1. Dataflow → triage each job first (below). The triage sets the timeline.
2. Spark or Hadoop (Dataproc) → EMR. Short jobs → EMR Serverless.
   Long-running clusters → EMR on EC2. Already on Kubernetes → EMR on EKS.
3. Busy dashboards, high concurrency, heavy joins → Redshift (start with
   Serverless).
4. Lake files or occasional queries → Athena on S3 with Iceberg tables.
5. Event stream → Kinesis Data Streams, or MSK for very large streams or
   Kafka-skilled teams.
6. Work queue or fan-out → SQS / SNS + SQS.

A common target: one copy of the data as Iceberg in S3, read by Athena and
Spark, with Redshift reading the same tables for fast dashboards.

## BigQuery → Redshift or Athena

- Redshift Serverless is closest to BigQuery: no sizing, scales itself,
  billed for compute time (RPU-hours). Provisioned Redshift for steady
  heavy load.
- Athena bills per TB scanned, like BigQuery on-demand. Partition by date
  and compact small files, or costs grow. Use Iceberg so rows can be
  updated and deleted.
- Redshift Serverless bills while queries run, so a dashboard refreshing
  every minute keeps it running all day. Set usage limits (max RPU-hours)
  on day one.

## Data move

1. Export BigQuery tables to Parquet in GCS (`EXPORT DATA` or `bq extract
   --destination_format=PARQUET`).
2. Copy GCS → S3 with DataSync (reads GCS directly with an HMAC key).
3. Register as Iceberg tables in the Glue Data Catalog, or load into
   Redshift with `COPY ... FORMAT AS PARQUET`.
4. Keep new data flowing with dual writes, dual pipelines, or DMS change
   data capture.
5. Compare row counts and column totals daily per table. Switch readers
   only when they match.

AWS SCT converts BigQuery schemas and much of the SQL. Treat its output as
a first draft. AWS publishes a step-by-step DMS/SCT guide for BigQuery →
Redshift.

## Dataproc → EMR

| Dataproc | EMR |
|---|---|
| `gs://` paths | `s3://` paths (search jobs, configs, notebooks, Airflow variables) |
| Initialization actions | Bootstrap actions |
| Cluster properties | EMR configurations (classification JSON) |
| Autoscaling policy | EMR managed scaling |
| Spot secondary workers | Spot task nodes (instance fleets) |
| Dataproc Metastore | Glue Data Catalog |
| Dataproc Serverless | EMR Serverless |
| Cloud Storage connector | EMRFS / S3A (built in) |

Match Spark, Scala, and Python versions exactly: pick the EMR release
label whose Spark version matches the Dataproc image. Upgrade later as a
separate change.

```hcl
# GCP
resource "google_dataproc_cluster" "etl" {
  cluster_config {
    master_config { num_instances = 1  machine_type = "n2-standard-8" }
    worker_config { num_instances = 2  machine_type = "n2-standard-8" }
    initialization_action { script = "gs://etl-scripts/setup.sh" }
  }
}

# AWS
resource "aws_emr_cluster" "etl" {
  name          = "etl"
  release_label = "emr-7.x.0" # pick the one whose Spark matches Dataproc
  applications  = ["Spark"]
  service_role  = aws_iam_role.emr_service.arn
  ec2_attributes {
    subnet_id        = var.private_subnet_id
    instance_profile = aws_iam_instance_profile.emr_ec2.arn
  }
  master_instance_group { instance_type = "m7i.2xlarge" }
  core_instance_group {
    instance_type  = "m7i.2xlarge"
    instance_count = 2
  }
  bootstrap_action {
    name = "setup"
    path = "s3://etl-scripts/setup.sh"
  }
}
```

## Dataflow (Apache Beam)

No 1:1 target. Triage every job into one of:

1. **Google-provided template, no custom code** (e.g. Pub/Sub → BigQuery,
   GCS text → BigQuery) → often Amazon Data Firehose (delivers to S3,
   Iceberg tables, or Redshift) or a Glue job. No code.
2. **Batch pipeline** → rewrite as a Glue job or EMR Serverless Spark job.
3. **Streaming, logic-heavy** → keep Beam and run it on Managed Service for
   Apache Flink (Beam's Flink runner). The team needs some Flink tuning
   skills.
4. **Simple streaming** (filter, enrich, window, aggregate) → rewrite in
   Flink SQL.

Things to check per job: windowing and triggers, late-data handling
(watermarks), exactly-once sinks, side inputs, and BigQuery I/O
connectors, which need replacements.

## Pub/Sub

| Use | AWS target |
|---|---|
| Analytics event stream | Kinesis Data Streams (ordered per shard, replay; feeds Firehose and Flink) |
| Very large streams or Kafka-skilled team | MSK |
| Fan-out to several consumers | SNS + one SQS queue per consumer |
| Work queue with retries | SQS + dead-letter queue |
| Push to an HTTPS endpoint | EventBridge (API destinations) or SNS HTTPS subscriptions |

| | Pub/Sub | Kinesis Data Streams | SQS |
|---|---|---|---|
| Ordering | per ordering key (opt-in) | per shard (partition key) | FIFO queues only (lower throughput) |
| Retention | up to 31 days | 24 h default, up to 365 days | up to 14 days |
| Replay | seek to time/snapshot | read from sequence or timestamp | no |
| Push delivery | yes | no (consumers poll) | no (consumers poll) |
| Delivery | at least once (exactly-once opt-in for pull) | at least once | at least once (standard), exactly-once processing (FIFO) |

Assume duplicates and make every consumer idempotent.

## Composer → MWAA

- Keep the same Airflow version. Upgrade after the move.
- Replace Google operators with Amazon provider operators:
  `BigQueryInsertJobOperator` → `RedshiftDataOperator` or
  `AthenaOperator`; `DataprocSubmitJobOperator` →
  `EmrAddStepsOperator` / `EmrServerlessStartJobOperator`;
  `GCSToBigQueryOperator` → `S3ToRedshiftOperator`; Dataflow operators →
  `GlueJobOperator` or the chosen target.
- Composer service account → MWAA execution role. Airflow connections and
  variables → Secrets Manager backend.
- One Airflow can drive both clouds during the move (keep the Google
  provider installed in MWAA until cutover).

## Catalog and access control

GCP IAM on datasets and tables, plus BigQuery/Dataplex column- and
row-level policies, become Glue Data Catalog + Lake Formation
permissions (enforced by Athena, Redshift Spectrum, EMR, and Glue). No
tool converts them. Export the current bindings, review them (many are
old and too broad), and rebuild with LF-tags (tag-based access) so new
tables are covered automatically.

## Other services

- Data Fusion → Glue visual ETL. Rebuild pipelines.
- Datastream → DMS (CDC from MySQL, PostgreSQL, Oracle, SQL Server).
- BigQuery ML → Redshift ML or SageMaker AI. Retrain; models don't copy.
- Looker Studio → QuickSight. Rebuild dashboards; repoint Looker, Tableau,
  and notebooks to the new warehouse.
- Bigtable → DynamoDB or Keyspaces. A different data model; plan it as a
  separate project.

## Billing differences

| GCP | AWS |
|---|---|
| BigQuery on-demand, per TiB scanned | Athena, per TB scanned |
| BigQuery editions (slot-hours) | Redshift Serverless RPU-hours, or provisioned nodes |
| Slot commitments | Redshift reserved nodes / Serverless reservations |
| Long-term storage discount (90 days unchanged) | S3 classes; Redshift managed storage flat |
| Dataproc fee on top of VMs | EMR fee on top of EC2 (Spot task nodes cut cost) |
| Pub/Sub per TiB | Kinesis per shard-hour (provisioned) or per GB (on-demand); MSK per broker-hour |

Don't reserve capacity until usage is steady.

## Things that bite later

- BigQuery `TIMESTAMP` is always UTC. Redshift has `TIMESTAMP` (no zone)
  and `TIMESTAMPTZ`. Check date filters in the top reports
  (`big-data-sql.md`).
- Streaming into S3 creates many small files. Compact on a schedule
  (Iceberg `OPTIMIZE`/rewrite data files).
- `gs://` paths hidden in Spark configs, Airflow variables, notebooks, and
  SQL (external tables).
- Service account key files in pipelines → IAM roles; delete the keys.
- Low default quotas for EMR, Kinesis shards, and Glue concurrent runs.
- Egress: apply for Google's free exit-transfer offer and ask AWS about
  migration credits before the bulk copy (`cost-limits.md`).
