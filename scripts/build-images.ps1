$ErrorActionPreference = "Stop"

$deckRoot = "data\decks\sallys-sanctum-tarot\images"
$sourceDir = Join-Path $deckRoot "source"

$sizes = @(
  @{ Name = "thumb";  Width = 240;  Height = 360;  Quality = 80 },
  @{ Name = "medium"; Width = 640;  Height = 960;  Quality = 84 },
  @{ Name = "large";  Width = 1024; Height = 1536; Quality = 88 }
)

if (-not (Test-Path $sourceDir)) {
  throw "Source directory not found: $sourceDir"
}

foreach ($size in $sizes) {
  $outDir = Join-Path $deckRoot $size.Name
  New-Item -ItemType Directory -Force $outDir | Out-Null

  Get-ChildItem $sourceDir -Filter "*.png" |
    Where-Object { $_.BaseName -ne "favicon" } |
    ForEach-Object {
      $outFile = Join-Path $outDir "$($_.BaseName).webp"

      Write-Host "Generating $outFile"

      magick $_.FullName `
        -resize "$($size.Width)x$($size.Height)" `
        -strip `
        -quality $($size.Quality) `
        -define webp:method=6 `
        $outFile
    }
}



$devilRoot = Join-Path $deckRoot "devil"
$devilSourceDir = Join-Path $devilRoot "source"

if (Test-Path $devilSourceDir) {
  foreach ($size in $sizes) {
    $outDir = Join-Path $devilRoot $size.Name
    New-Item -ItemType Directory -Force $outDir | Out-Null

    Get-ChildItem $devilSourceDir -Filter "*.png" |
      Where-Object { $_.BaseName -ne "favicon" } |
      ForEach-Object {
        $outFile = Join-Path $outDir "$($_.BaseName).webp"

        Write-Host "Generating devil variant $outFile"

        magick $_.FullName `
          -resize "$($size.Width)x$($size.Height)" `
          -strip `
          -quality $($size.Quality) `
          -define webp:method=6 `
          $outFile
      }
  }
}

Write-Host "Done."
