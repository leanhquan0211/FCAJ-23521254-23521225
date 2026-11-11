output "website_url" {
  description = "The HTTPS CloudFront URL of the website"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "api_gateway_url" {
  description = "The direct endpoint URL of the API Gateway"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "dynamodb_table_name" {
  description = "The DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "s3_bucket_name" {
  description = "The S3 bucket holding frontend files"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "The CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.cdn.id
}


