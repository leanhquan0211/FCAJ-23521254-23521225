# Compatibility entrypoint: resolve the current Terraform deployment, never pin a URL.
& (Join-Path $PSScriptRoot 'start-aws.ps1')
