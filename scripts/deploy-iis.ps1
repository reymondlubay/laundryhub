param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Dest
)
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not [System.IO.Path]::IsPathRooted($Source)) {
    $Source = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Source))
}

function Write-DestAccessHelp {
    param([string]$Dest)
    $acct = "{0}\{1}" -f $env:USERDOMAIN, $env:USERNAME
    Write-Host ""
    Write-Host "Access denied to destination folder (robocopy ERROR 5 means the same thing)." -ForegroundColor Red
    Write-Host "Do one of the following:" -ForegroundColor Yellow
    Write-Host "  1) Open terminal as Administrator and run: npm run deploy:laundry-local (or deploy:laundry-network), or"
    Write-Host "  2) Grant your account Modify once (run PowerShell as Administrator):"
    Write-Host ""
    Write-Host ('  icacls "{0}" /grant "{1}:(OI)(CI)M"' -f $Dest, $acct) -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If files are locked (e.g. IIS or another process), stop that app briefly, deploy, then start it again." -ForegroundColor DarkGray
}

if (-not (Test-Path -LiteralPath $Source)) {
    $leaf = Split-Path -LiteralPath $Source -Leaf
    $hint = if ($leaf) {
        " Run first: npm run build:$leaf"
    } else {
        " Run the matching npm run build:<target> script first."
    }
    Write-Error "Source folder does not exist: $Source.$hint"
}

$Dest = [System.IO.Path]::GetFullPath($Dest)
if (-not (Test-Path -LiteralPath $Dest)) {
    try {
        New-Item -ItemType Directory -Path $Dest -Force -ErrorAction Stop | Out-Null
    } catch {
        Write-DestAccessHelp -Dest $Dest
        exit 5
    }
}

$probe = Join-Path $Dest (".deploy-write-test-" + [guid]::NewGuid().ToString("N"))
try {
    $null | Set-Content -LiteralPath $probe -ErrorAction Stop
    Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
} catch {
    Write-DestAccessHelp -Dest $Dest
    exit 5
}

robocopy $Source $Dest /MIR /NFL /NDL /NJH /NJS /nc /ns /np
if ($LASTEXITCODE -ge 8) {
    exit $LASTEXITCODE
}
exit 0
