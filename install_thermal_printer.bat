@echo off
echo ========================================
echo ZKTeco Thermal Printer Installation
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script requires Administrator privileges.
    echo Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Step 1: Opening Device Manager to check USB connection...
echo Please verify your printer is connected and showing as "STMicroelectronics POS80 Printer USB"
echo.
start devmgmt.msc
timeout /t 3

echo.
echo Step 2: Opening Printers & Scanners settings...
echo.
start ms-settings:printers
timeout /t 2

echo.
echo ========================================
echo MANUAL STEPS TO COMPLETE:
echo ========================================
echo.
echo 1. In the Printers window that just opened, click "Add a printer or scanner"
echo.
echo 2. Wait for Windows to search, then click "The printer that I want isn't listed"
echo.
echo 3. Select "Add a local printer or network printer with manual settings"
echo.
echo 4. For the port, select "USB001" or "USB002" (whichever shows your printer)
echo    - If no USB port is available, click "Create a new port" and select "Standard TCP/IP Port"
echo.
echo 5. For the driver:
echo    - Click "Windows Update" to download latest drivers
echo    - OR select "Generic / Text Only" for basic functionality
echo    - OR select "EPSON TM-T20" or "EPSON TM-T88" (compatible with most POS printers)
echo.
echo 6. Name your printer (e.g., "ZKTeco Thermal Printer")
echo.
echo 7. Set it as the default printer for automatic printing
echo.
echo ========================================
echo.

echo Opening printer driver download page in browser...
start https://www.zkteco.com/en/support_download

echo.
echo If the above steps don't work, download the official driver from ZKTeco website
echo and install it manually.
echo.
pause
