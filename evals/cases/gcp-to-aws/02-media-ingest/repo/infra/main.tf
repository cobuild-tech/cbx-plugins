terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

variable "project_id" { type = string }

resource "google_storage_bucket" "incoming" {
  name                        = "${var.project_id}-media-incoming"
  location                    = "us-central1"
  uniform_bucket_level_access = true
}

resource "google_service_account" "media" {
  account_id = "media-pipeline"
}

resource "google_pubsub_topic" "media_events" {
  name                       = "media-events"
  message_retention_duration = "604800s"
}

resource "google_cloud_tasks_queue" "transcode" {
  name     = "transcode"
  location = "us-central1"

  rate_limits {
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 3
  }

  retry_config {
    max_attempts       = 4
    min_backoff        = "30s"
    max_backoff        = "600s"
    max_doublings      = 3
  }
}

# Fires on every new object and on every overwrite of an existing name.
resource "google_cloudfunctions2_function" "ingest" {
  name     = "media-ingest"
  location = "us-central1"

  build_config {
    runtime     = "python312"
    entry_point = "on_upload"
    source {
      storage_source {
        bucket = "${var.project_id}-fn-src"
        object = "ingest.zip"
      }
    }
  }

  service_config {
    timeout_seconds       = 60
    service_account_email = google_service_account.media.email
    environment_variables = {
      TASKS_QUEUE   = google_cloud_tasks_queue.transcode.id
      TRANSCODE_URL = google_cloudfunctions2_function.transcode.url
      EVENTS_TOPIC  = google_pubsub_topic.media_events.id
    }
  }

  event_trigger {
    event_type   = "google.cloud.storage.object.v1.finalized"
    retry_policy = "RETRY_POLICY_DO_NOT_RETRY"
    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.incoming.name
    }
  }
}

resource "google_cloudfunctions2_function" "transcode" {
  name     = "media-transcode"
  location = "us-central1"

  build_config {
    runtime     = "python312"
    entry_point = "transcode"
    source {
      storage_source {
        bucket = "${var.project_id}-fn-src"
        object = "transcode.zip"
      }
    }
  }

  service_config {
    timeout_seconds       = 1800
    available_memory      = "4Gi"
    service_account_email = google_service_account.media.email
  }
}

resource "google_bigquery_dataset" "media" {
  dataset_id = "media"
  location   = "us-central1"
}
