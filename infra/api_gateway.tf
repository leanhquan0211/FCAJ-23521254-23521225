resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
    allow_headers = ["Content-Type", "Authorization", "X-CSRF-Token", "Idempotency-Key", "Origin"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

locals {
  api_routes = [
    "POST /auth/register",
    "POST /auth/login",
    "GET /auth/session",
    "POST /auth/logout",
    "GET /me/registrations",
    "GET /health",
    "GET /events",
    "GET /events/{eventId}",
    "POST /events/{eventId}/registrations",
    "GET /registrations/{registrationId}",
    "POST /admin/login",
    "GET /admin/session",
    "POST /admin/logout",
    "GET /admin/events",
    "POST /admin/events",
    "PUT /admin/events/{eventId}",
    "DELETE /admin/events/{eventId}",
    "GET /admin/users",
    "PUT /admin/users/{userId}",
    "DELETE /admin/users/{userId}"
  ]
}

resource "aws_apigatewayv2_route" "routes" {
  for_each  = toset(local.api_routes)
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

