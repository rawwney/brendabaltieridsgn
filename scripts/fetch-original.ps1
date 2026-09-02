Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$baseUrl = 'https://brenda-baltieri-portfolio.brennda-exe.chatgpt.site'
$projectRoot = Split-Path -Parent $PSScriptRoot
$staticRoot = Join-Path $projectRoot 'static'

function Save-RemoteAsset {
  param([Parameter(Mandatory = $true)][string]$AssetPath)

  $relativePath = $AssetPath.TrimStart('/')
  $destination = Join-Path $staticRoot ($relativePath -replace '/', [IO.Path]::DirectorySeparatorChar)
  $destinationDirectory = Split-Path -Parent $destination
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri ($baseUrl + $AssetPath) -OutFile $destination
  return $destination
}

New-Item -ItemType Directory -Force -Path $staticRoot | Out-Null

$coreAssets = @(
  '/_next/static/css/index.RpOZUcmN.css',
  '/_next/static/chunks/rolldown-runtime-C60lm6uB.js',
  '/_next/static/chunks/index-B2ebyzV0.js',
  '/_next/static/chunks/framework-BgSIrAUN.js',
  '/_next/static/chunks/layout-segment-context-BCvoNGE3.js',
  '/_next/static/chunks/PortfolioClient-Cfijaua1.js',
  '/brand/brenda-asterisk-icon.png',
  '/og.png'
)

foreach ($asset in $coreAssets) {
  Save-RemoteAsset -AssetPath $asset | Out-Null
}

$portfolioBundlePath = Join-Path $staticRoot '_next/static/chunks/PortfolioClient-Cfijaua1.js'
$bundleText = Get-Content -Raw -LiteralPath $portfolioBundlePath
$coverPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
[regex]::Matches($bundleText, 'cover:\s*`(?<path>/projects/[^`]+)`') | ForEach-Object {
  [void]$coverPaths.Add($_.Groups['path'].Value)
}

$requestedAssets = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
[regex]::Matches($bundleText, '/projects/[^`"]+\.(?:webp|png|gif|mp4)') | ForEach-Object {
  $assetPath = $_.Value
  $extension = [IO.Path]::GetExtension($assetPath).ToLowerInvariant()

  if ($coverPaths.Contains($assetPath) -or $extension -in @('.gif', '.mp4')) {
    [void]$requestedAssets.Add($assetPath)
  }

  if ($extension -notin @('.gif', '.mp4')) {
    $popupPath = '/projects/popup/' + (($assetPath -replace '^/projects/', '') -replace '\.[^/.]+$', '-popup.webp')
    [void]$requestedAssets.Add($popupPath)
  }
}

$downloaded = 0
$skipped = 0
foreach ($assetPath in $requestedAssets) {
  try {
    Save-RemoteAsset -AssetPath $assetPath | Out-Null
    $downloaded++
  } catch {
    $skipped++
  }
}

$indexPath = Join-Path $staticRoot 'index.html'
Invoke-WebRequest -UseBasicParsing -Uri ($baseUrl + '/') -OutFile $indexPath
$indexHtml = Get-Content -Raw -LiteralPath $indexPath
$indexHtml = $indexHtml.Replace('</head>', '<link rel="preconnect" href="https://use.typekit.net"/><link rel="stylesheet" href="/responsive-fixes.css"/></head>')
$indexHtml = [regex]::Replace($indexHtml, '<script>\(function\(\)\{function c\(\).*?</script>', '', [Text.RegularExpressions.RegexOptions]::Singleline)
Set-Content -LiteralPath $indexPath -Value $indexHtml -Encoding utf8NoBOM

$bundleText = Get-Content -Raw -LiteralPath $portfolioBundlePath
$bundleText = $bundleText.Replace('Math.max(0,650-(performance.now()-r))', 'Math.max(0,100-(performance.now()-r))')
$bundleText = $bundleText.Replace('window.setTimeout(i,2200)', 'window.setTimeout(i,1000)')
Set-Content -LiteralPath $portfolioBundlePath -Value $bundleText -Encoding utf8NoBOM

[pscustomobject]@{
  CoreAssets = $coreAssets.Count
  ProjectAssets = $downloaded
  MissingOptionalAssets = $skipped
  StaticRoot = $staticRoot
}
