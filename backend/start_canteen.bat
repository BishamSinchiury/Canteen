@echo off
REM Navigate to project directory
cd /d C:\Canteen\backend

REM Activate the virtual environment
call .venv\Scripts\activate.bat

REM Start Waitress
python -m waitress --listen=127.0.0.1:8000 canteen.wsgi:application

