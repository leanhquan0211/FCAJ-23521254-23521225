data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda"
  output_path = "${path.module}/build/lambda_backend.zip"
  excludes = [
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    ".venv"
  ]
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "lambda_exec" {
  name                 = "${var.project_name}-lambda-exec"
  permissions_boundary = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/fcaj-project-lambda-boundary"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:ConditionCheckItem",
          "dynamodb:TransactWriteItems"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/fcaj-project-*",
          "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/fcaj-project-*:*"
        ]
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda_log" {
  name              = "/aws/lambda/fcaj-project-backend"
  retention_in_days = 7
}

resource "aws_lambda_function" "backend" {
  function_name    = "fcaj-project-backend"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.13"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      APP_ENV                  = "aws"
      DYNAMODB_TABLE           = aws_dynamodb_table.main.name
      DYNAMODB_REGION          = var.aws_region
      COOKIE_SECURE            = "true"
      ALLOWED_ORIGINS          = var.allowed_origins
      USER_AUTH_WINDOW_SECONDS = "900"
      USER_LOGIN_IP_LIMIT      = "2000"
      USER_LOGIN_ACCOUNT_LIMIT = "10"
      USER_SIGNUP_IP_LIMIT     = "2000"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_log]
}

