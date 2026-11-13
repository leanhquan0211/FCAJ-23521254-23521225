param(
    [string]$DeploymentRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path,
    [string]$Profile = 'default',
    [switch]$AllowWrites,
    [string]$CleanupRunId,
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$labRoot = Split-Path -Parent $PSScriptRoot
Push-Location $labRoot
try {
    $json = & python -B tests/load/sync_aws.py --infra (Join-Path $DeploymentRoot 'infra')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read deployment target. Runner was not started.' }
    $target = $json | ConvertFrom-Json
    $env:AWS_PROFILE = $Profile
    $env:LAB_ENV = 'aws'
    $env:API_TEST_URL = $target.apiUrl
    $env:LAB_ALLOWED_HOST = $target.host
    $env:LAB_EXPECTED_TABLE = $target.table
    $env:LAB_EXPECTED_FUNCTION_ARN = $target.functionArn
    $env:LAB_ORIGIN = $target.origin
    $env:LAB_AWS_REGION = $target.region
    $env:LAB_FUNCTION_NAME = $target.function
    $env:LAB_ALLOW_WRITES = 'false'
    $env:LAB_WRITE_TARGET = ''
    if ($CleanupRunId -and -not $AllowWrites) { throw 'Cleanup needs -AllowWrites and an explicit run ID.' }
    Write-Host ('API: ' + $target.apiUrl)
    Write-Host ('Database: ' + $target.table + ' | Lambda: ' + $target.function)
    if ($CheckOnly -and ($AllowWrites -or $CleanupRunId)) { throw '-CheckOnly cannot be combined with write/cleanup options.' }
    if ($CheckOnly -or $AllowWrites) {
        & python -B tests/load/check_aws.py --audit
        if ($LASTEXITCODE -ne 0) { throw 'AWS read preflight failed. No Admin login or write was attempted.' }
    }
    if ($CheckOnly) { return }
    if ($AllowWrites) {
        # Interactive secret never appears in command history, files, browser or reports.
        $credential = Get-Credential -UserName 'admin_test' -Message 'Admin website password for AWS test'
        if (-not $credential -or $credential.Password.Length -eq 0) { throw 'No password entered. Runner was not started.' }
        $env:LAB_ADMIN_USERNAME = $credential.UserName
        $env:LAB_ADMIN_PASSWORD = $credential.GetNetworkCredential().Password
        $env:LAB_ALLOW_WRITES = 'true'
        $env:LAB_WRITE_TARGET = $target.functionArn + '|' + $target.table
        Remove-Variable credential
    }
    if ($CleanupRunId) {
        & python -B tests/load/cleanup.py --run-id $CleanupRunId --execute --confirm $CleanupRunId
    } else {
        & python -B tests/runner/server.py
    }
    if ($LASTEXITCODE -ne 0) { throw 'Runner stopped with an error.' }
} finally {
    Remove-Item Env:LAB_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    $env:LAB_ALLOW_WRITES = 'false'
    $env:LAB_WRITE_TARGET = ''
    Pop-Location
}
