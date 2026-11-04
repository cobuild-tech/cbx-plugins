# Big data: Redshift, Athena, Glue, EMR, Kinesis, MWAA

The services map easily. The SQL, pricing, and message semantics differ in
small ways. Move the data carefully, prove the numbers match, then switch
readers one at a time. For SQL conversion read `big-data-sql.md`.

## Decide in order (stop at the first yes)

1. Glue ETL jobs → triage each job first (below). The triage sets the
   timeline.
2. Spark or Hadoop (EMR) → Dataproc. Short or bursty jobs → Dataproc
   Serverless (Serverless for Apache Spark). Long-running clusters →
   Dataproc on Compute Engine. EMR on EKS → Dataproc on GKE or Spark on GKE.
3. Warehouse (Redshift) or SQL over the lake (Athena) → BigQuery. Keep
   lake files as BigLake / Iceberg tables when Spark also reads them.
4. Kafka (MSK) → Managed Service for Apache Kafka. Keep Kafka clients.
5. Event stream (Kinesis Data Streams) → Pub/Sub.
6. Delivery stream (Firehose) → Pub/Sub BigQuery or Cloud Storage
   subscription.
7. Key-value or document store (DynamoDB) → decide per table (below); plan
   it as its own project.

## Redshift and Athena → BigQuery

- BigQuery has no cluster or workgroup to size. On-demand bills per TiB
  scanned (like Athena); editions bill slot-hours (closer to Redshift
  Serverless RPU-hours or provisioned nodes). Check current prices.
- Distribution and sort keys don't exist. Use `PARTITION BY` (date or
  integer range) and `CLUSTER BY` (up to four columns) instead. Set
  `require_partition_filter` on big tables if Athena partition pruning
  kept costs down.
- On-demand scans bill for every column read. `SELECT *` dashboards that
  were cheap on provisioned Redshift get expensive. Set per-user or
  per-project query quotas (custom quotas) on day one.
- Redshift Spectrum and Athena over Glue tables → BigLake tables (Parquet,
  ORC, Iceberg in GCS) or BigQuery managed tables.

## Data move

1. Unload to Parquet in S3 (`UNLOAD ... FORMAT AS PARQUET` for Redshift;
   Athena data is already there).
2. Copy S3 → GCS with Storage Transfer Service (reads S3 directly with an
   IAM role or access key you create for it).
3. Load into BigQuery (`bq load --source_format=PARQUET`, `LOAD DATA`), or
   define BigLake external tables over GCS.
4. Keep new data flowing with dual writes, dual pipelines, or Datastream
   CDC from the source databases.
5. Compare row counts and column totals daily per table. Switch readers
   only when they match.

BigQuery Migration Service (batch and interactive SQL translator, plus
the Redshift transfer in BigQuery Data Transfer Service) converts schemas
and much of the SQL. Treat its output as a first draft.

## EMR → Dataproc

| EMR | Dataproc |
|---|---|
| `s3://` paths | `gs://` paths (search jobs, configs, notebooks, Airflow variables) |
| Bootstrap actions | Initialization actions |
| Configurations (classification JSON) | Cluster properties (`spark:`, `hdfs:` prefixes) |
| Managed scaling | Autoscaling policy |
| Spot task nodes / instance fleets | Spot secondary workers |
| Glue Data Catalog as metastore | Dataproc Metastore, or BigLake metastore |
| EMR Serverless | Dataproc Serverless |
| EMRFS consistent view | Not needed (GCS is strongly consistent) |
| EMR release label | Dataproc image version: match Spark/Hive versions, not the label |

The Cloud Storage connector is preinstalled. `s3a://` code paths must
change; there's no transparent S3 shim.

## Glue jobs

No 1:1 target. Triage every job into one of:

1. **Spark script (PySpark/Scala)** → Dataproc Serverless batch. Replace
   `GlueContext`, `DynamicFrame`, and `awsglue` imports with plain Spark
   DataFrames; `getResolvedOptions` → job arguments.
2. **Glue visual / Studio jobs** → rebuild in Dataflow templates, Dataform,
   or BigQuery SQL. Small transforms are often just a scheduled query.
3. **Python shell jobs** → Cloud Run jobs.
4. **Streaming Glue jobs** → Dataflow streaming, or Dataproc Spark
   Structured Streaming.
5. **Crawlers** → no crawler. Define tables explicitly (BigLake, Dataplex
   discovery for GCS).

Bookmarks (incremental state) have no equivalent. Rebuild the "what has
been processed" logic explicitly and test it.

## Kinesis and SQS/SNS → Pub/Sub

| Use | GCP target |
|---|---|
| Kinesis Data Streams | Pub/Sub topic with ordering keys = partition key where order matters |
| MSK | Managed Service for Apache Kafka |
| Firehose → S3 / Redshift | Pub/Sub Cloud Storage or BigQuery subscription |
| Kinesis Data Analytics / Managed Flink | Dataflow (Beam), or Flink on Dataproc |
| SNS + SQS fan-out | One topic, one subscription per consumer |

| | Kinesis Data Streams | Pub/Sub |
|---|---|---|
| Ordering | per shard (partition key) | per ordering key (opt-in, per region) |
| Retention | 24 h default, up to 365 days | subscription up to 7 days; topic retention up to 31 days |
| Replay | from sequence number or timestamp | seek to timestamp or snapshot |
| Capacity | shards or on-demand | no shards; quotas per project |
| Consumers | shared or enhanced fan-out, checkpoint in DynamoDB (KCL) | each subscription tracks its own acks |
| Delivery | at least once | at least once (exactly-once opt-in for pull) |

KCL checkpoint tables disappear: acks replace checkpoints. A consumer
that reprocessed from a stored sequence number needs seek or snapshots
instead. Message size limit is 10 MB on Pub/Sub; check current limits.

## MWAA → Composer

- Keep the same Airflow version. Upgrade after the move.
- Replace Amazon provider operators with Google ones:
  `RedshiftDataOperator` / `AthenaOperator` → `BigQueryInsertJobOperator`;
  `EmrAddStepsOperator` / `EmrServerlessStartJobOperator` →
  `DataprocSubmitJobOperator` / `DataprocCreateBatchOperator`;
  `S3ToRedshiftOperator` → `GCSToBigQueryOperator`; `GlueJobOperator` →
  the chosen target.
- MWAA execution role → Composer service account. Secrets Manager backend
  → Secret Manager backend.
- One Airflow can drive both clouds during the move (keep the Amazon
  provider installed in Composer until cutover).

## Catalog and access control

Lake Formation permissions and LF-tags, plus Redshift grants and RLS,
become BigQuery dataset/table IAM, column-level security (policy tags),
row access policies, and Dataplex for lake governance. No tool converts
them. Export the current grants, review them, and rebuild.

## DynamoDB

Decide per table:

1. Point reads and writes by key at very high throughput, wide rows,
   time series → Bigtable.
2. Document data, mobile/web clients, modest scale, simple queries →
   Firestore.
3. Multi-row transactions, relational queries, global consistency →
   Spanner.

Streams → Firestore triggers, Bigtable change streams, or Spanner change
streams. TTL → Firestore TTL policies or Bigtable garbage collection.
GSIs → Firestore composite indexes or Spanner secondary indexes.
Conditional writes → transactions. Flag every one of these.

## Other services

- DMS → Database Migration Service (homogeneous) or Datastream (CDC into
  BigQuery).
- QuickSight → Looker Studio or Looker. Rebuild dashboards; repoint
  Tableau and notebooks to BigQuery.
- Redshift ML → BigQuery ML. SageMaker → Vertex AI. Retrain; models
  don't copy unless they are framework artifacts you can re-serve.
- Lake Formation blueprints → Datastream or Dataflow templates.

## Billing differences

| AWS | GCP |
|---|---|
| Athena, per TB scanned | BigQuery on-demand, per TiB scanned |
| Redshift Serverless RPU-hours / provisioned nodes | BigQuery editions (slot-hours, autoscaling) |
| Redshift reserved nodes | Slot commitments |
| S3 storage classes | BigQuery active and long-term storage (90 days unchanged); logical or physical billing |
| EMR fee on top of EC2 | Dataproc fee on top of VMs |
| Kinesis per shard-hour or per GB | Pub/Sub per TiB of throughput |

Don't buy commitments until usage is steady. Check current prices.

## Things that bite later

- Redshift `TIMESTAMP` (no zone) loaded into BigQuery `TIMESTAMP` is
  treated as UTC. If the column held local time, load it as `DATETIME`
  (`big-data-sql.md`).
- `s3://` paths hidden in Spark configs, Airflow variables, notebooks,
  and external table DDL.
- Access keys used by pipelines → service accounts; delete the keys.
- BigQuery DML and table update quotas per table per day. Row-by-row
  `INSERT` loops from Redshift ETL must become batch loads or `MERGE`.
- Egress out of AWS for the bulk copy: ask AWS about the data transfer
  credit for leaving and Google about migration credits
  (`cost-limits.md`).
