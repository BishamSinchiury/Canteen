# PowerShell script to install ZKTeco thermal printer
# Run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZKTeco Thermal Printer Auto-Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for admin rights
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "Please right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Step 1: Checking for USB printer ports..." -ForegroundColor Yellow
$usbPorts = Get-PrinterPort | Where-Object { $_.Name -like "USB*" }

if ($usbPorts.Count -eq 0) {
    Write-Host "No USB printer ports found. Creating virtual port..." -ForegroundColor Yellow
    
    # Create a USB port
    try {
        Add-PrinterPort -Name "USB001" -ErrorAction Stop
        Write-Host "Created USB001 port" -ForegroundColor Green
    } catch {
        Write-Host "Could not create USB port: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Found USB ports:" -ForegroundColor Green
    $usbPorts | Format-Table Name, Description
}

Write-Host ""
Write-Host "Step 2: Installing Generic Text printer driver..." -ForegroundColor Yellow

try {
    # Try to add printer with Generic / Text Only driver
    $printerName = "ZKTeco Thermal Printer"
    
    # Check if printer already exists
    $existingPrinter = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
    if ($existingPrinter) {
        Write-Host "Printer '$printerName' already exists. Removing..." -ForegroundColor Yellow
        Remove-Printer -Name $printerName -Confirm:$false
    }
    
    # Add the printer
    Add-Printer -Name $printerName -DriverName "Generic / Text Only" -PortName "USB001"
    
    Write-Host ""
    Write-Host "SUCCESS! Printer installed as '$printerName'" -ForegroundColor Green
    Write-Host ""
    
    # Set as default
    $setDefault = Read-Host "Set as default printer? (Y/N)"
    if ($setDefault -eq "Y" -or $setDefault -eq "y") {
        $printer = Get-CimInstance -ClassName Win32_Printer -Filter "Name='$printerName'"
        Invoke-CimMethod -InputObject $printer -MethodName SetDefaultPrinter
        Write-Host "Set as default printer" -ForegroundColor Green
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Could not install with Generic driver: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solutions:" -ForegroundColor Yellow
    Write-Host "1. Download official ZKTeco driver from: https://www.zkteco.com/en/support_download" -ForegroundColor White
    Write-Host "2. Try using EPSON TM-T20 or TM-T88 driver (compatible with most POS printers)" -ForegroundColor White
    Write-Host "3. Install via Windows Settings > Printers & Scanners > Add Printer" -ForegroundColor White
}

Write-Host ""
Write-Host "Current installed printers:" -ForegroundColor Cyan
Get-Printer | Format-Table Name, DriverName, PortName, PrinterStatus

Write-Host ""
pause
