# Storage: S3, EBS, EFS, FSx, backup

The heaviest part of the move, but the most predictable. The work is in
cold classes, access rules, tiny files, and a verified final sync.

## Decide in order (stop at the first yes)

1. Bucket → Cloud Storage. Pick the class by how often it's read;
   Autoclass when nobody knows.
2. Disk on a single VM → Persistent Disk `pd-balanced` or Hyperdisk
   Balanced (Hyperdisk Extreme only for the busiest databases). Moves
   with the VM under Migrate to Virtual Machines.
3. Shared folder → Filestore (NFS). NetApp Volumes for SMB, mixed
   NFS/SMB, or ONTAP features. Parallelstore or Managed Lustre for heavy
   compute (ML training) instead of FSx for Lustre.
4. Backups → Backup and DR Service (backup vaults), with a copy in a
   separate project.

## Storage classes

| S3 | GCS | Min billed duration | Retrieval |
|---|---|---|---|
| Standard | Standard | none | immediate |
| Standard-IA, One Zone-IA | Nearline | 30 days | immediate, per-GB fee |
| Glacier Instant Retrieval | Coldline | 90 days | immediate, per-GB fee |
| Glacier Flexible Retrieval | Archive (or Coldline) | 365 days (Archive) | immediate, per-GB fee |
| Glacier Deep Archive | Archive | 365 days | immediate, per-GB fee |
| Intelligent-Tiering | Autoclass | none | immediate |

- **Every GCS class is online.** There is no `RestoreObject` step, so
  restore code (`restore_object`, polling `x-amz-restore`) is deleted, not
  ported. The flip side: reads are instant but billed per GB, and anything
  that now reads cold data freely (scans, backfills) can cost a lot.
- **Minimum durations change.** Glacier Flexible Retrieval is 90 days on
  S3; Archive is 365. Deleting or overwriting early is billed to the
  minimum. Check lifecycle rules that delete before 365 days.
- No 128 KB minimum object charge in GCS cold classes, but per-operation
  fees are higher in colder classes. Lifecycle transitions are per-object
  operations: check current docs before moving millions of tiny files.
- One Zone-IA has no GCS twin; every GCS class is at least zone-redundant
  within its location.

## Bucket features

| S3 | GCS |
|---|---|
| Lifecycle configuration | Lifecycle rules (`age`, `num_newer_versions`, `days_since_noncurrent_time`) |
| Versioning | Object versioning (or soft delete, on by default with 7-day retention; check current docs) |
| Single-region bucket + CRR | Region, dual-region, or multi-region bucket; turbo replication for dual-region |
| Object Lock (governance/compliance) | Bucket Lock (retention policy, locked) or object retention lock |
| SSE-S3 / SSE-KMS | Google-managed encryption (default) / CMEK with Cloud KMS |
| Event Notifications / EventBridge | Pub/Sub notifications or Eventarc (different payload) |
| Pre-signed URLs (SigV4) | V4 signed URLs (max 7 days; signing with an attached SA needs `iam.serviceAccounts.signBlob`) |
| Object Ownership: bucket owner enforced | Uniform bucket-level access |
| Bucket policy + IAM | IAM on the bucket (no resource-policy JSON; no `Deny` with conditions except IAM deny policies) |
| Block Public Access | Public access prevention |
| CloudFront + OAC | Cloud CDN with a backend bucket, or a load balancer |
| `aws s3` / `aws s3api` | `gcloud storage` |
| S3 Requester Pays | Requester Pays |
| S3 Object Lambda, S3 Select | None; move logic into the app or BigQuery external tables |

GCS bucket names are global too. Pick and create names early; the S3
name may be taken (and names containing dots need domain verification).

## Code

```python
# AWS
import boto3
s3 = boto3.client("s3")
s3.upload_file("q3.pdf", "reports-prod", "2026/q3.pdf",
               ExtraArgs={"ContentType": "application/pdf"})
url = s3.generate_presigned_url(
    "get_object", Params={"Bucket": "reports-prod", "Key": "2026/q3.pdf"},
    ExpiresIn=3600)

# GCP
from datetime import timedelta
from google.cloud import storage
blob = storage.Client().bucket("reports-prod").blob("2026/q3.pdf")
blob.upload_from_filename("q3.pdf", content_type="application/pdf")
url = blob.generate_signed_url(version="v4", expiration=timedelta(hours=1))
```

On Cloud Run or GKE with no key file, `generate_signed_url` needs the
service account email and an access token (or the IAM `signBlob` API);
grant the SA `roles/iam.serviceAccountTokenCreator` on itself.

```hcl
# AWS
resource "aws_s3_bucket" "reports" { bucket = "reports-prod" }
resource "aws_s3_bucket_versioning" "reports" {
  bucket = aws_s3_bucket.reports.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    id     = "cold-after-90"
    status = "Enabled"
    filter {}
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
  }
}

# GCP
resource "google_storage_bucket" "reports" {
  name                        = "reports-prod" # names are global
  location                    = "US-EAST1"     # was us-east-1; single region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning { enabled = true }
  lifecycle_rule {
    condition { age = 90 }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE" # was GLACIER_IR
    }
  }
}
```

Keep the bucket in the region that matches the old S3 region unless the
user asks for dual- or multi-region; a location change is a decision,
logged in `decisions.md`.

## Disks

| EBS | GCP | Note |
|---|---|---|
| gp2 / gp3 | `pd-balanced` or Hyperdisk Balanced | Hyperdisk sets IOPS/throughput independently of size |
| io1 / io2 Block Express | Hyperdisk Extreme or `pd-extreme` | |
| st1 / sc1 | Hyperdisk Throughput or `pd-standard` | |
| Multi-Attach io2 | Hyperdisk multi-writer / PD multi-writer (limited) | Check current docs |
| Instance store | Local SSD | Data lost on stop |
| Snapshots | Snapshots (global or regional) / machine images | |
| (none: one AZ only) | Regional PD / Hyperdisk Balanced HA | Synchronous across two zones; a new option, not a forced change |

PD performance grows with disk size; gp3 does not. Size `pd-*` from the
measured IOPS and throughput, or use Hyperdisk to provision them directly.

## File shares

- **Filestore:** NFS, provisioned capacity (EFS bills stored bytes).
  Pick the tier (Basic, Zonal, Regional, Enterprise) by size and
  availability; Regional/Enterprise for EFS multi-AZ parity.
- **NetApp Volumes:** NFS and SMB, snapshots and clones, same tools as
  FSx for NetApp ONTAP.
- **FSx for Windows File Server:** NetApp Volumes (SMB with AD) or
  Windows VMs with storage.
- **FSx for Lustre:** Managed Lustre or Parallelstore; or read GCS
  directly with Cloud Storage FUSE and caching.

## Copying data

- **S3 → GCS:** Storage Transfer Service reads S3 directly (access key,
  or federated role access for a Google-managed identity). It verifies
  objects, copies only changes on later runs, and can be scheduled. For
  very large buckets use S3 Inventory manifests. rclone is fine for small
  buckets.
- **EFS/FSx → Filestore:** Storage Transfer Service with agents on VMs
  that mount both, or rsync from a VM over the inter-cloud link.
- **Disks:** move with their VMs via Migrate to Virtual Machines.
- **Offline:** Transfer Appliance moves data into GCP; Snowball Edge is
  closed to new customers (since Nov 7, 2025). The network is usually the
  answer.

Procedure per bucket or share:

1. Full copy while the source stays live (days for big buckets).
2. Incremental catch-up copies, each shorter than the last.
3. Write freeze, final incremental copy, repoint apps.
4. Verify object counts, sizes, and checksums (Storage Transfer logs,
   CRC32C/MD5). Note that multipart S3 ETags aren't MD5s. Delete nothing
   on AWS until the checks pass.

Apply for AWS's data-transfer-out credit for migrations before the bulk
copy (`cost-limits.md`).

## Billing differences

- Requests: per 1,000 operations on both; higher for cold classes.
- Cold reads: per GB on both; no restore wait on GCS.
- Early deletion: billed to the minimum duration on both; Archive's
  minimum is 365 days.
- Shared files: Filestore bills provisioned capacity; EFS billed stored
  bytes. Size the instance from measured use plus growth.
- Private Google Access: VMs without external IPs reach GCS without NAT
  charges once it's enabled on the subnet.

## Things that bite later

- `s3://`, `*.s3.amazonaws.com`, and `s3.<region>.amazonaws.com` links in
  code, configs, scripts, database rows, emails, and links already sent
  to customers. Keep AWS serving or redirect until they age out.
- Lost `Content-Type` and `Cache-Control` metadata; S3 user metadata
  (`x-amz-meta-*`) becomes `x-goog-meta-*`.
- Code that assumes S3's `ListObjectsV2` paging or `StartAfter`
  semantics; port to the GCS client's pager.
- Restore/poll code for Glacier left in place, never firing.
- Event notification payloads differ, so handlers change
  (`serverless.md`).
