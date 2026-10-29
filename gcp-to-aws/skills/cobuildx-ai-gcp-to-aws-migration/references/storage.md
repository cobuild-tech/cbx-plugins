# Storage: Cloud Storage, disks, file shares, backup

The heaviest part of the move, but the most predictable. The work is in
cold classes, access rules, tiny files, and a verified final sync.

## Decide in order (stop at the first yes)

1. Bucket → S3. Pick the class by how often it's read; Intelligent-Tiering
   when nobody knows.
2. Disk on a single VM → EBS gp3 (io2 only for the busiest databases).
   Moves with the VM under MGN.
3. Shared folder → EFS. FSx for Windows File Server for SMB/Windows apps,
   FSx for NetApp ONTAP for mixed Linux/Windows or NetApp features, FSx
   for Lustre for heavy compute (ML training) reading from S3.
4. Backups → AWS Backup, with a copy in a separate account.

## Storage classes

| GCS | S3 | Min billed duration | Retrieval |
|---|---|---|---|
| Standard | S3 Standard | none | immediate |
| Nearline | S3 Standard-IA | 30 days | immediate |
| Coldline | S3 Glacier Instant Retrieval | 90 days | immediate |
| Archive (still read by apps) | S3 Glacier Instant Retrieval | 90 days | immediate |
| Archive (old backups, legal holds) | S3 Glacier Deep Archive | 180 days | restore first: hours |
| Autoclass | S3 Intelligent-Tiering | none | immediate (archive tiers opt-in) |

- **Every GCS class returns data in milliseconds.** S3 Glacier Flexible
  Retrieval and Deep Archive need a `RestoreObject` call that takes minutes
  to hours. Code that reads Archive objects directly fails on those two
  classes. Use Glacier Instant Retrieval if anything still reads the data.
- Standard-IA and Glacier Instant Retrieval bill every object as at least
  128 KB. Intelligent-Tiering doesn't tier objects under 128 KB.
- Lifecycle transitions into Glacier classes cost a fee per object.
  Copying a "move to Coldline after 90 days" rule onto millions of small
  objects can cost more than it saves. Bundle tiny files or leave them in
  Standard.

## Bucket features

| GCS | S3 |
|---|---|
| Lifecycle rules | S3 Lifecycle configuration |
| Object versioning | S3 Versioning |
| Dual-region / multi-region | Single-region bucket + S3 Replication (CRR) |
| Retention policy / bucket lock | S3 Object Lock (enable at bucket creation) |
| CMEK (Cloud KMS) | SSE-KMS |
| Pub/Sub notifications | S3 Event Notifications or EventBridge (different payload) |
| Signed URLs | Pre-signed URLs (SigV4, max 7 days) |
| Uniform bucket-level access | Bucket owner enforced (ACLs disabled; default) |
| IAM roles on bucket (e.g. Storage Object Viewer) | IAM policies + bucket policy |
| Public bucket | Keep Block Public Access on; serve through CloudFront with OAC |
| `gcloud storage` / `gsutil` | `aws s3` / `aws s3api` |

S3 bucket names are global. Pick and create names early; the GCP name
may be taken.

## Code

```python
# GCP
from datetime import timedelta
from google.cloud import storage
blob = storage.Client().bucket("reports").blob("2026/q3.pdf")
blob.upload_from_filename("q3.pdf")
url = blob.generate_signed_url(expiration=timedelta(hours=1))

# AWS
import boto3
s3 = boto3.client("s3")
s3.upload_file("q3.pdf", "reports-prod", "2026/q3.pdf",
               ExtraArgs={"ContentType": "application/pdf"})
url = s3.generate_presigned_url(
    "get_object", Params={"Bucket": "reports-prod", "Key": "2026/q3.pdf"},
    ExpiresIn=3600)
```

`upload_file` doesn't guess `Content-Type` the way GCS client libraries
do. Without it, browsers download files instead of displaying them. Set
it explicitly, and check that the bulk copy preserved it.

```hcl
# GCP
resource "google_storage_bucket" "reports" {
  name                        = "reports"
  location                    = "US"
  uniform_bucket_level_access = true
  versioning { enabled = true }
  lifecycle_rule {
    condition { age = 90 }
    action { type = "SetStorageClass"  storage_class = "COLDLINE" }
  }
}

# AWS
resource "aws_s3_bucket" "reports" {
  bucket = "reports-prod" # names are global
}
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
      storage_class = "GLACIER_IR" # was COLDLINE
    }
  }
}
```

`location = "US"` (multi-region) has no single-bucket S3 equivalent: note
it as a behavior difference and add replication if the user needs it.

## Disks

| GCP | EBS | Note |
|---|---|---|
| pd-standard | st1 (throughput) or gp3 | |
| pd-balanced | gp3 | |
| pd-ssd | gp3 with provisioned IOPS/throughput | |
| pd-extreme, Hyperdisk Extreme | io2 Block Express | |
| Hyperdisk Balanced/Throughput | gp3 / st1 | |
| Regional PD (sync across 2 zones) | No match | An EBS volume lives in one AZ. Use a database replica in a second AZ, or snapshots |
| Local SSD | Instance store | Data lost on stop; rebuildable data only |

PD performance grows with disk size. gp3 starts at 3,000 IOPS and
125 MB/s regardless of size, and you pay for more. Size from the
measured IOPS and throughput, not from the GB.

## File shares

- **EFS:** NFS, grows and shrinks, multi-AZ, bills for what you store
  (Filestore bills provisioned size). Slower opening many small files one
  by one; test with the real app.
- **FSx for NetApp ONTAP:** NFS and SMB together, snapshots and clones,
  same tools as NetApp Volumes.
- **FSx for Lustre:** high-throughput work, linked to an S3 bucket.
- **FSx for Windows File Server:** SMB and Active Directory.

## Copying data

- **GCS → S3:** DataSync agentless transfer. Reads GCS through its
  S3-compatible XML API with an HMAC key, verifies every file, copies only
  changes on later runs, and writes task reports. rclone is fine for small
  buckets; DataSync is safer for large ones (verification, retries,
  incremental runs, audit report).
- **Filestore → EFS/FSx:** DataSync with an agent on a GCP VM near the
  data.
- **Disks:** move with their VMs via AWS Transform MGN.
- **Offline:** Snowball Edge is closed to new customers (since Nov 7,
  2025), and Transfer Appliance only moves data into GCP. Use the network.

Procedure per bucket or share:

1. Full copy while the source stays live (days for big buckets).
2. Incremental catch-up copies, each shorter than the last.
3. Write freeze, final incremental copy, repoint apps.
4. Verify object counts, sizes, and checksums (DataSync reports). Delete
   nothing on GCP until the checks pass.

Apply for Google's free exit-transfer program before the bulk copy
(`cost-limits.md`).

## Billing differences

- Requests: per 1,000 operations on both; higher for cold classes on AWS.
- Cold reads: per GB on both, plus a restore wait for Glacier Flexible
  Retrieval and Deep Archive.
- Early deletion: billed to the minimum duration on both, plus the 128 KB
  per-object minimum on AWS.
- Shared files: Filestore bills provisioned capacity; EFS bills stored
  bytes.
- NAT: S3 traffic through a NAT gateway is billed per GB. Add a free S3
  gateway endpoint to every VPC.
- Turn on S3 Storage Lens early to see object counts and size
  distribution.

## Things that bite later

- `gs://` and `storage.googleapis.com` / `storage.cloud.google.com` links
  in code, configs, scripts, database rows, emails, and links already sent
  to customers. Keep GCP serving or redirect until they age out.
- Lost `Content-Type` and `Cache-Control` metadata.
- Code that reads Archive objects breaking on Deep Archive until objects
  are restored.
- A brand-new bucket hit hard on day one. S3 scales per prefix over time
  (thousands of requests per second per prefix); ramp traffic up.
- Event notification payloads differ, so handlers change
  (`serverless.md`).
