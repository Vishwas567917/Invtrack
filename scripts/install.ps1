param ( 
    [Parameter(Mandatory=$false, ValueFromRemainingArguments=$true)]
    [string[]]$packages
)

$venvPath = "venv"

if (-not (Test-Path -Path $venvPath)) {
    Write-Host "🔍 No virtual environment found. Creating one..." -ForegroundColor Cyan
    python -m venv $venvPath
}

Write-Host "🚀 Activating Environment..." -ForegroundColor Gray
& ".\$venvPath\Scripts\Activate.ps1"

if ($packages.Count -eq 0) {
    if (Test-Path "requirements.txt") {
        Write-Host "📦 Restoring environment from requirements.txt..." -ForegroundColor Yellow
        pip install -r requirements.txt
    } else {
        Write-Host "⚠️ No packages provided and requirements.txt not found!" -ForegroundColor Red
    }
} else {
    foreach ($pkg in $packages) {
        Write-Host "⬇️ Attempting to install: $pkg..." -ForegroundColor Yellow
        pip install $pkg

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $pkg is ready!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install $pkg" -ForegroundColor Red
        }
    }

    Write-Host "📝 Updating requirements.txt with new dependencies..." -ForegroundColor Magenta
    pip freeze | Out-File -FilePath requirements.txt -Encoding ascii
}

Write-Host "✨ All done!" -ForegroundColor Cyan