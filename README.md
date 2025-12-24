# EECOHM Canteen Management System

A comprehensive, production-ready canteen management system for EECOHM School of Excellence.

## 🚀 Features

- **Role-Based Access**: Admin, Manager, and Cashier roles with specific permissions.
- **POS System**: Fast and efficient Point of Sale interface with thermal receipt printing.
- **Credit Accounts**: Manage student and teacher credit accounts with balance tracking.
- **Financial Tracking**: Automated cashbook, expense tracking, and daily reconciliation.
- **Reporting**: Detailed sales reports, daily/monthly summaries, and CSV exports.
- **Atomic Transactions**: Data integrity guaranteed with atomic database operations.

## 🛠️ Technology Stack

- **Backend**: Django, Django REST Framework, Gunicorn
- **Frontend**: React, Vite, CSS Modules
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Nginx

## 📋 Prerequisites

- Docker and Docker Compose installed on your machine.

## 🏃‍♂️ Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd Canteen
   ```

2. **Start the application:**
   ```bash
   docker-compose up --build
   ```
   This will start:
   - PostgreSQL database
   - Django Backend (Gunicorn)
   - Frontend Builder (compiles React app)
   - Nginx (Reverse Proxy & Static File Server)

3. **Access the application:**
   open `http://localhost` in your browser.

4. **Login Credentials:**
   The system comes pre-seeded with sample users:

   - **Admin**: `admin` / `adminpass`
   - **Manager**: `manager` / `managerpass`
   - **Cashier**: `cashier` / `cashierpass`

## ⚙️ Configuration

### Environment Variables
Environment variables are managed in `docker-compose.yml` for simplicity in this setup. For production, consider using a `.env` file.

**Backend:**
- `SECRET_KEY`: Django secret key (Change for production)
- `DEBUG`: Set to `0` for production
- `DATABASE_URL`: Connection string for PostgreSQL

### Printing
The system is designed to work with standard 80mm thermal receipt printers. When a transaction is completed, the browser's print dialog will open automatically. Ensure your printer settings (margins, scale) are configured correctly in the browser.

## 📂 Project Structure

- `backend/`: Django project code
  - `accounts/`: User and Credit Account management
  - `menu/`: Food item management
  - `transactions/`: Sale and receipt logic
  - `ledger/`: Cashbook and expenses
  - `reports/`: Reporting views
- `frontend/`: React application
  - `src/components/`: Reusable UI components
  - `src/pages/`: Application pages
  - `src/context/`: Global state (Auth)
- `nginx/`: Nginx configuration

## 🤝 Development

To run in development mode with hot-reloading:

1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py runserver
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📝 License

Restricted to EECOHM School of Excellence usage.
