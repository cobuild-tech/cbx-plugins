provider "aws" { region = "us-east-1" }
variable "env" { type = string }

resource "aws_s3_bucket" "uploads" { bucket = "${var.env}-uploads" }
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    id     = "tier-and-expire"
    status = "Enabled"
    filter {}
    transition { days = 30  storage_class = "STANDARD_IA" }
    expiration { days = 365 }
  }
}

resource "aws_sqs_queue" "orders_dlq" {
  name       = "orders-dlq.fifo"
  fifo_queue = true
}
resource "aws_sqs_queue" "orders" {
  name                        = "orders.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 360
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_db_instance" "db" {
  identifier                          = "app-db"
  engine                              = "postgres"
  engine_version                      = "15"
  instance_class                      = "db.m6g.large"
  allocated_storage                   = 50
  multi_az                            = true
  iam_database_authentication_enabled = true
  backup_retention_period             = 7
  username                            = "app"
  manage_master_user_password         = true
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service" identifiers = ["lambda.amazonaws.com"] }
  }
}
resource "aws_iam_role" "api" {
  name               = "api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}
resource "aws_iam_role_policy" "api" {
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.uploads.arn}/*" },
      { Effect = "Allow", Action = ["sqs:SendMessage"], Resource = aws_sqs_queue.orders.arn },
      { Effect = "Allow", Action = ["rds-db:connect"], Resource = "*" },
      { Effect = "Allow", Action = ["athena:StartQueryExecution", "athena:GetQueryExecution"], Resource = "*" }
    ]
  })
}
resource "aws_iam_role" "worker" {
  name               = "worker-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_lambda_function" "api" {
  function_name                  = "api"
  role                           = aws_iam_role.api.arn
  package_type                   = "Image"
  image_uri                      = "123456789012.dkr.ecr.us-east-1.amazonaws.com/api:latest"
  timeout                        = 300
  memory_size                    = 1024
  reserved_concurrent_executions = 20
  environment { variables = { BUCKET = aws_s3_bucket.uploads.bucket, QUEUE_URL = aws_sqs_queue.orders.url } }
}
resource "aws_lambda_provisioned_concurrency_config" "api" {
  function_name                     = aws_lambda_function.api.function_name
  qualifier                         = "live"
  provisioned_concurrent_executions = 1
}
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM"
}

resource "aws_lambda_function" "worker" {
  function_name = "orders-worker"
  role          = aws_iam_role.worker.arn
  runtime       = "python3.12"
  handler       = "worker.handle"
  filename      = "worker.zip"
  timeout       = 60
  memory_size   = 512
}
resource "aws_lambda_event_source_mapping" "worker" {
  event_source_arn        = aws_sqs_queue.orders.arn
  function_name           = aws_lambda_function.worker.arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
}

resource "aws_scheduler_schedule" "nightly" {
  name                         = "nightly-rollup"
  schedule_expression          = "cron(0 2 * * ? *)"
  schedule_expression_timezone = "America/New_York"
  flexible_time_window { mode = "OFF" }
  target {
    arn      = aws_lambda_function.api.arn
    role_arn = aws_iam_role.api.arn
    input    = jsonencode({ path = "/jobs/rollup" })
  }
}
