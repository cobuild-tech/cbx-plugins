provider "google" { project = var.project  region = "us-central1" }
variable "project" { type = string }

resource "google_storage_bucket" "uploads" {
  name                        = "${var.project}-uploads"
  location                    = "US"
  uniform_bucket_level_access = true
  versioning { enabled = true }
  lifecycle_rule {
    condition { age = 30 }
    action { type = "SetStorageClass" storage_class = "NEARLINE" }
  }
  lifecycle_rule {
    condition { age = 365 }
    action { type = "Delete" }
  }
}

resource "google_pubsub_topic" "orders" { name = "orders" }
resource "google_pubsub_subscription" "orders_worker" {
  name                    = "orders-worker"
  topic                   = google_pubsub_topic.orders.id
  ack_deadline_seconds    = 60
  enable_message_ordering = true
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.orders_dlq.id
    max_delivery_attempts = 5
  }
}
resource "google_pubsub_topic" "orders_dlq" { name = "orders-dlq" }

resource "google_sql_database_instance" "db" {
  name             = "app-db"
  database_version = "POSTGRES_15"
  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"
    database_flags { name = "cloudsql.iam_authentication" value = "on" }
    backup_configuration { enabled = true point_in_time_recovery_enabled = true }
  }
}

resource "google_service_account" "api" { account_id = "api-sa" }
resource "google_storage_bucket_iam_member" "api_obj" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = "us-central1"
  template {
    service_account                  = google_service_account.api.email
    max_instance_request_concurrency = 80
    timeout                          = "900s"
    scaling { min_instance_count = 1 max_instance_count = 20 }
    containers {
      image = "us-docker.pkg.dev/${var.project}/app/api:latest"
      env { name = "BUCKET" value = google_storage_bucket.uploads.name }
      resources { limits = { cpu = "2", memory = "1Gi" } }
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance { instances = [google_sql_database_instance.db.connection_name] }
    }
  }
}

resource "google_cloudfunctions2_function" "worker" {
  name     = "orders-worker"
  location = "us-central1"
  build_config { runtime = "python312" entry_point = "handle" }
  service_config { timeout_seconds = 540 available_memory = "512M" }
  event_trigger {
    event_type   = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic = google_pubsub_topic.orders.id
    retry_policy = "RETRY_POLICY_RETRY"
  }
}

resource "google_bigquery_dataset" "analytics" { dataset_id = "analytics" location = "US" }
resource "google_cloud_scheduler_job" "nightly" {
  name     = "nightly-rollup"
  schedule = "0 2 * * *"
  time_zone = "America/New_York"
  http_target { uri = "${google_cloud_run_v2_service.api.uri}/jobs/rollup" http_method = "POST" }
}
