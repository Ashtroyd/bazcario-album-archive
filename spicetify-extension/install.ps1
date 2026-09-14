$ErrorActionPreference = "Stop"

$ExtensionName = "album-archive.js"
$ReleaseTag = "spicetify-v0.1.0-beta.1"
$DefaultUrl = "https://github.com/Ashtroyd/bazcario-album-archive/releases/download/$ReleaseTag/$ExtensionName"
$ExtensionUrl = if ($env:ALBUM_ARCHIVE_EXTENSION_URL) { $env:ALBUM_ARCHIVE_EXTENSION_URL } else { $DefaultUrl }

if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
    throw "Spicetify is not installed or is not available on PATH. Install it from https://spicetify.app/docs/getting-started/ first."
}

$ConfigPath = (spicetify -c | Select-Object -Last 1).Trim()
$ConfigDirectory = Split-Path -Parent $ConfigPath
$ExtensionsDirectory = Join-Path $ConfigDirectory "Extensions"
$Destination = Join-Path $ExtensionsDirectory $ExtensionName
$TemporaryFile = Join-Path ([System.IO.Path]::GetTempPath()) "album-archive-$([guid]::NewGuid().ToString('N')).js"

New-Item -ItemType Directory -Force -Path $ExtensionsDirectory | Out-Null

try {
    Write-Host "Downloading Album Archive for Spicetify..."
    Invoke-WebRequest -UseBasicParsing -Uri $ExtensionUrl -OutFile $TemporaryFile

    if (-not (Select-String -Quiet -SimpleMatch "Album Archive" -Path $TemporaryFile)) {
        throw "The downloaded file does not look like the Album Archive extension."
    }

    Move-Item -Force -Path $TemporaryFile -Destination $Destination
}
finally {
    if (Test-Path $TemporaryFile) {
        Remove-Item -Force $TemporaryFile
    }
}

$EnabledExtensions = (spicetify config extensions) -split "\|"
if ($EnabledExtensions -notcontains $ExtensionName) {
    spicetify config extensions $ExtensionName
}

spicetify apply

Write-Host ""
Write-Host "Album Archive is installed."
Write-Host "Open Spotify, select Album Archive, and connect with a token from:"
Write-Host "https://bazcario-album-archive.vercel.app/profile"
