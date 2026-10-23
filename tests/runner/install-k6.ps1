param([string]$Version = 'latest')
$ErrorActionPreference = 'Stop'
$toolsDirectory = Join-Path $PSScriptRoot '.tools'
New-Item -ItemType Directory -Path $toolsDirectory -Force | Out-Null
$releaseUrl = if ($Version -eq 'latest') { 'https://api.github.com/repos/grafana/k6/releases/latest' } else {
    if ($Version -notmatch '^v\d+\.\d+\.\d+$') { throw 'Version must be vMAJOR.MINOR.PATCH.' }
    "https://api.github.com/repos/grafana/k6/releases/tags/$Version"
}
$release = Invoke-RestMethod -Uri $releaseUrl
$asset = @($release.assets | Where-Object name -Match '^k6-v[\d.]+-windows-amd64.zip$')
$checksums = @($release.assets | Where-Object name -Match 'checksums.*\.txt$')
if ($asset.Count -ne 1 -or $checksums.Count -ne 1) { throw 'Official release assets not recognized.' }
$archive = Join-Path $toolsDirectory $asset[0].name
Invoke-WebRequest -Uri $asset[0].browser_download_url -OutFile $archive -UseBasicParsing
$checksumText = (Invoke-WebRequest -Uri $checksums[0].browser_download_url -UseBasicParsing).Content
if ($checksumText -is [byte[]]) { $checksumText = [System.Text.Encoding]::UTF8.GetString($checksumText) }
$match = [regex]::Match($checksumText, '(?m)^([a-fA-F0-9]{64})\s+\*?' + [regex]::Escape($asset[0].name) + '\s*$')
if (-not $match.Success) { throw 'Archive checksum missing.' }
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $match.Groups[1].Value) { throw 'SHA256 mismatch; do not execute the download.' }
$unpacked = Join-Path $toolsDirectory $release.tag_name
Expand-Archive -LiteralPath $archive -DestinationPath $unpacked -Force
$binary = @(Get-ChildItem -LiteralPath $unpacked -Recurse -File -Filter k6.exe)
if ($binary.Count -ne 1) { throw 'Expected one k6 executable.' }
Copy-Item -LiteralPath $binary[0].FullName -Destination (Join-Path $toolsDirectory 'k6.exe')
& (Join-Path $toolsDirectory 'k6.exe') version
