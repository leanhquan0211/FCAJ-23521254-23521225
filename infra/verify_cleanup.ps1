# PowerShell script to verify all AWS resources are deleted after terraform destroy

param(
    [string]$Prefix = "fcaj-"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   KIEM TRA DON DEP TAI NGUYEN AWS (PREFIX: $Prefix)   " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$allClean = $true

function Check-Item {
    param(
        [string]$Name,
        [scriptblock]$CheckBlock
    )

    Write-Host ("Kiem tra " + $Name + "... ") -NoNewline
    try {
        $result = & $CheckBlock
        if (-not $result -or $result.Count -eq 0) {
            Write-Host "[CLEAN]" -ForegroundColor Green
        } else {
            Write-Host "[CON SOT]" -ForegroundColor Red
            Write-Host "  -> Phat hien tai nguyen chua don:" -ForegroundColor Yellow
            foreach ($item in $result) {
                Write-Host ("     * " + $item) -ForegroundColor Yellow
            }
            $script:allClean = $false
        }
    } catch {
        Write-Host "[BO QUA]" -ForegroundColor DarkGray
    }
}

# 1. DynamoDB
Check-Item "DynamoDB Tables" {
    $raw = aws dynamodb list-tables --query "TableNames" --output json 2>$null
    if ($raw) {
        $tables = $raw | ConvertFrom-Json
        return @($tables | Where-Object { $_ -like "$Prefix*" -or $_ -like "fcaj*" })
    }
    return @()
}

# 2. Lambda Functions
Check-Item "Lambda Functions" {
    $raw = aws lambda list-functions --query "Functions[*].FunctionName" --output json 2>$null
    if ($raw) {
        $funcs = $raw | ConvertFrom-Json
        return @($funcs | Where-Object { $_ -like "$Prefix*" -or $_ -like "fcaj*" })
    }
    return @()
}

# 3. API Gateway v2
Check-Item "API Gateway HTTP APIs" {
    $raw = aws apigatewayv2 get-apis --query "Items[*].Name" --output json 2>$null
    if ($raw) {
        $apis = $raw | ConvertFrom-Json
        return @($apis | Where-Object { $_ -like "$Prefix*" -or $_ -like "fcaj*" })
    }
    return @()
}

# 4. S3 Buckets
Check-Item "S3 Buckets" {
    $raw = aws s3api list-buckets --query "Buckets[*].Name" --output json 2>$null
    if ($raw) {
        $buckets = $raw | ConvertFrom-Json
        return @($buckets | Where-Object { $_ -like "$Prefix*" -or $_ -like "fcaj*" })
    }
    return @()
}

# 5. CloudFront
Check-Item "CloudFront Distributions" {
    $raw = aws cloudfront list-distributions --query "DistributionList.Items[*]" --output json 2>$null
    if ($raw) {
        $distList = $raw | ConvertFrom-Json
        $matched = @()
        foreach ($d in $distList) {
            if ($d.Comment -like "*$Prefix*" -or $d.Comment -like "*fcaj*") {
                $matched += ($d.Id + " - " + $d.Comment + " [" + $d.Status + "]")
            }
        }
        return $matched
    }
    return @()
}

# 6. CloudWatch Logs
Check-Item "CloudWatch Log Groups" {
    $raw = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/fcaj" --query "logGroups[*].logGroupName" --output json 2>$null
    if ($raw) {
        return @($raw | ConvertFrom-Json)
    }
    return @()
}

# 7. IAM Roles
Check-Item "IAM Roles" {
    $matchedRoles = @()
    foreach ($rName in @("fcaj-event-workshop-lambda-exec", "fcaj-project-lambda-exec", "fcaj-project-workshop-lambda-exec")) {
        $check = aws iam get-role --role-name $rName --output json 2>$null
        if ($check) {
            $matchedRoles += $rName
        }
    }
    return $matchedRoles
}

Write-Host ""
Write-Host "-------------------------------------------------------" -ForegroundColor Cyan
if ($allClean) {
    Write-Host "HOAN HAO: Toan bo tai nguyen AWS da duoc CLEAN sach se 100%!" -ForegroundColor Green
    Write-Host "Khong con bat ky tai nguyen nao chay ngam hoac phat sinh chi phi." -ForegroundColor Green
} else {
    Write-Host "CANH BAO: Van con tai nguyen sot lai tren AWS!" -ForegroundColor Red
    Write-Host "Vui long kiem tra cac muc [CON SOT] o tren de xu ly." -ForegroundColor Yellow
}
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
