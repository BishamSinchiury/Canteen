
@echo off
echo Restarting Canteen Backend...

:: 1. Stop existing Python processes (Waitress)
taskkill /F /IM python.exe /T >nul 2>&1

:: 2. Start the app again using the main startup script
call c:\Canteen\backend\start_canteen.bat

echo Done! app restarted.
timeout /t 3
