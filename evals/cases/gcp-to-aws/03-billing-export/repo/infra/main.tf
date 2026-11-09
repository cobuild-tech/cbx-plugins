terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = "europe-west1"
}

variable "project_id" { type = string }

resource "google_service_account" "export" {
  account_id = "billing-export"
}

resource "google_secret_manager_secret" "partner_api_key" {
  secret_id = "partner-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "export_reads_key" {
  secret_id = google_secret_manager_secret.partner_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.export.email}"
}

resource "google_redis_instance" "dedupe" {
  name               = "export-dedupe"
  tier               = "STANDARD_HA"
  memory_size_gb     = 1
  region             = "europe-west1"
  redis_version      = "REDIS_7_0"
  auth_enabled       = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"
}

resource "google_vpc_access_connector" "export" {
  name          = "export-connector"
  region        = "europe-west1"
  ip_cidr_range = "10.8.0.0/28"
  network       = "default"
}

resource "google_storage_bucket" "exports" {
  name                        = "${var.project_id}-billing-exports"
  location                    = "europe-west1"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  retention_policy {
    retention_period = 220752000 # 7 years, required for invoices
    is_locked        = true
  }

  autoclass {
    enabled = true
  }
}

resource "google_cloud_run_v2_job" "export" {
  name     = "billing-export"
  location = "europe-west1"

  template {
    parallelism = 4
    task_count  = 16

    template {
      service_account = google_service_account.export.email
      timeout         = "10800s"
      max_retries     = 2

      vpc_access {
        connector = google_vpc_access_connector.export.id
        egress    = "PRIVATE_RANGES_ONLY"
      }

      containers {
        image = "europe-docker.pkg.dev/${var.project_id}/jobs/billing-export:latest"
        resources {
          limits = { cpu = "2", memory = "4Gi" }
        }
        env {
          name = "PARTNER_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.partner_api_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.dedupe.host
        }
        env {
          name  = "EXPORT_BUCKET"
          value = google_storage_bucket.exports.name
        }
      }
    }
  }
}

resource "google_cloud_scheduler_job" "monthly" {
  name      = "billing-export-monthly"
  schedule  = "0 3 1 * *"
  time_zone = "Europe/Berlin"

  http_target {
    http_method = "POST"
    uri         = "https://run.googleapis.com/v2/projects/${var.project_id}/locations/europe-west1/jobs/billing-export:run"
    oauth_token {
      service_account_email = google_service_account.export.email
    }
  }
}
