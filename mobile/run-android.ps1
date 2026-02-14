# Script pour lancer l'app Emeraude Business sur l'émulateur Android
# Usage: .\run-android.ps1  (depuis le dossier mobile)

$ErrorActionPreference = "Stop"
$AndroidHome = $env:ANDROID_HOME
if (-not $AndroidHome) { $AndroidHome = "C:\Users\pc\AppData\Local\Android\Sdk" }

# 1. Vérifier si un appareil/émulateur est déjà connecté
$devices = adb devices
if ($devices -match "emulator-\d+\s+device") {
    Write-Host "Emulateur deja connecte. Lancement de l'app..." -ForegroundColor Green
} else {
    Write-Host "Aucun emulateur detecte. Demarrage de l'emulateur..." -ForegroundColor Yellow
    $avds = & "$AndroidHome\emulator\emulator.exe" -list-avds
    if ($avds) {
        $avd = ($avds -split "`n")[0].Trim()
        Start-Process -FilePath "$AndroidHome\emulator\emulator.exe" -ArgumentList "-avd", $avd -WindowStyle Normal
        Write-Host "Attente du demarrage de l'emulateur (45 s)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 45
        $again = adb devices
        if (-not ($again -match "emulator-\d+\s+device")) {
            Write-Host "L'emulateur met du temps. Relancez: npm run android" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Aucun AVD trouve. Creez un appareil virtuel dans Android Studio (AVD Manager)." -ForegroundColor Red
        exit 1
    }
}

# 2. Lancer Expo sur Android
Write-Host "Lancement de Expo (android)..." -ForegroundColor Cyan
npm run android
