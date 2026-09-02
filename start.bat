@echo off
cd /d "%~dp0"
echo [Disiplin] Menjalankan dev server yang bisa diakses via IP lokal...
echo   Local  : http://localhost:5173
echo   Network: http://<IP-KOMPUTER>:5173  (cek ipconfig)
echo   HP harus 1 WiFi dengan komputer & buka Network URL di browser HP
echo.
npm run dev:host
pause