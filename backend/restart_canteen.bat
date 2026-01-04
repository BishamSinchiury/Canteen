@echo off
REM -------------------------------
REM Restart Waitress for Canteen app
REM -------------------------------

REM 1. Navigate to backend folder
cd /d C:\Canteen\backend

REM 2. Kill any existing Waitress process (python running our app)
taskkill /F /IM python.exe /T >nul 2>&1

REM 3. Activate virtual environment
call .venv\Scripts\activate.bat

REM 4. Start Waitress
start "" python -m waitress --listen=127.0.0.1:8000 canteen.wsgi:application

echo Waitress has been restarted!
pause
