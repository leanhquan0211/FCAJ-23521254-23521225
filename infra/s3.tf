resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

locals {
  mime_types = {
    "html"  = "text/html"
    "css"   = "text/css"
    "js"    = "application/javascript"
    "json"  = "application/json"
    "png"   = "image/png"
    "jpg"   = "image/jpeg"
    "jpeg"  = "image/jpeg"
    "svg"   = "image/svg+xml"
    "woff"  = "font/woff"
    "woff2" = "font/woff2"
    "ico"   = "image/x-icon"
    "txt"   = "text/plain"
  }
}

resource "aws_s3_object" "frontend_files" {
  for_each = fileset("${path.module}/../frontend/dist", "**/*")

  bucket = aws_s3_bucket.frontend.id
  key    = each.value
  source = "${path.module}/../frontend/dist/${each.value}"
  etag   = filemd5("${path.module}/../frontend/dist/${each.value}")

  content_type = lookup(
    local.mime_types,
    regex("[^.]+$", each.value),
    "application/octet-stream"
  )
}

