# CloudWatch Monitoring: Simple, human-friendly Dashboard & Alarms

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: High-level Single Value Overview (Easy to read at a glance)
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 4
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.backend.function_name, { stat = "Sum", label = "Tong luot goi" }]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "🚀 Tong luot goi Backend (Invocations)"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 4
        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.backend.function_name, { stat = "Sum", color = "#d62728", label = "So loi" }]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "🚨 So loi Backend phat sinh (Errors)"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 4
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.backend.function_name, { stat = "Average", label = "Thoi gian TB (ms)" }]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "⏱️ Toc do phan hoi trung binh (ms)"
          period = 300
        }
      },

      # Row 2: Performance & API Traffic Graphs
      {
        type   = "metric"
        x      = 0
        y      = 4
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.backend.function_name, { stat = "Average", label = "Trung binh (ms)" }],
            ["...", { stat = "Maximum", color = "#ff7f0e", label = "Cham nhat (ms)" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "📈 Toc do xu ly Backend theo thoi gian (ms)"
          period  = 60
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 4
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiId", aws_apigatewayv2_api.http_api.id, { stat = "Sum", label = "Tong request" }],
            ["AWS/ApiGateway", "4xx", "ApiId", aws_apigatewayv2_api.http_api.id, { stat = "Sum", color = "#ffbb78", label = "Loi 4xx" }],
            ["AWS/ApiGateway", "5xx", "ApiId", aws_apigatewayv2_api.http_api.id, { stat = "Sum", color = "#d62728", label = "Loi 5xx" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "🌐 Luu luong API Gateway & Ma loi"
          period  = 60
        }
      },

      # Row 3: Database activity & Error logs
      {
        type   = "metric"
        x      = 0
        y      = 10
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.main.name, { stat = "Sum", label = "Doc (Read Units)" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.main.name, { stat = "Sum", color = "#2ca02c", label = "Ghi (Write Units)" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "💾 Hoat dong Co so du lieu DynamoDB"
          period  = 60
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 10
        width  = 12
        height = 6
        properties = {
          query  = "SOURCE '/aws/lambda/${aws_lambda_function.backend.function_name}' | fields @timestamp, @message | filter @message like /ERROR|Exception|503/ | sort @timestamp desc | limit 20"
          region = var.aws_region
          title  = "📝 Nhat ky cac loi gan nhat (Logs Insights)"
          view   = "table"
        }
      }
    ]
  })
}

# Alarm 1: Canh bao khi Backend co loi
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Canh bao tu dong khi Backend Lambda phat sinh tu 1 loi tro len trong 5 phut"

  dimensions = {
    FunctionName = aws_lambda_function.backend.function_name
  }

  treat_missing_data = "notBreaching"
  tags = {
    Environment = var.environment
  }
}

# Alarm 2: Canh bao khi Backend xu ly cham (tre tren 3 giay)
resource "aws_cloudwatch_metric_alarm" "lambda_latency" {
  alarm_name          = "${var.project_name}-lambda-high-latency"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 3000
  alarm_description   = "Canh bao khi thoi gian phan hoi trung binh cua Lambda vuot qua 3 giay (3000ms)"

  dimensions = {
    FunctionName = aws_lambda_function.backend.function_name
  }

  treat_missing_data = "notBreaching"
  tags = {
    Environment = var.environment
  }
}

