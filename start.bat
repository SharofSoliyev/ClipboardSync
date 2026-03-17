@echo off
title ClipSync - Clipboard Sync
cd /d "%~dp0"

:: Firewall rule tekshirish va qo'shish (admin talab qiladi)
netsh advfirewall firewall show rule name="ClipSync Server" >nul 2>&1
if errorlevel 1 (
    echo [ClipSync] Firewall rule qo'shilmoqda...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"ClipSync Server\" dir=in action=allow protocol=TCP localport=3847 profile=any' -Verb runAs" 2>nul
    timeout /t 3 >nul
)

:: Node.js tekshirish
where node >nul 2>&1
if errorlevel 1 (
    echo [XATO] Node.js topilmadi! https://nodejs.org dan yuklab o'rnating.
    pause
    exit /b 1
)

:: Bog'liqliklarni tekshirish
if not exist node_modules (
    echo [ClipSync] Bog'liqliklar o'rnatilmoqda...
    npm install
)

echo.
echo Starting ClipSync...
node server.js
pause
