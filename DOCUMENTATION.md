# EECOHM Canteen Management System - Comprehensive Documentation

## Project Overview
The **EECOHM Canteen Management System (V2)** is a full-stack web application designed to manage canteen operations for educational institutions. It facilitates sales tracking, inventory management, credit accounting for students and staff, and comprehensive financial reporting.

---

## 1. Technical Documentation

### Tech Stack
- **Frontend**: React (Vite), Vanilla CSS (Custom UI kit), React Router, JWT Authentication.
- **Backend**: Django REST Framework, PostgreSQL.
- **Tools**: Python-dotenv (env management), Dj-database-url, Psycopg2-binary, Pillow (Image processing).

### System Architecture
The application follows a decoupled architecture:
1.  **Backend (API)**: A Python Django application serving as a RESTful API.
2.  **Frontend (SPA)**: A React application that consumes the API.
3.  **Database**: PostgreSQL for persistent storage.

### Key Modules (Backend)
- `accounts`: Manages system users (Admin, Manager, Cashier) and Credit Accounts (Students/Teachers).
- `menu`: Manages food items, categories, and portion-based pricing.
- `transactions`: Handles the core POS logic, including atomic transactions for sales, credit updates, and receipt generation.
- `ledger`: Records cashbook entries (income/expenses) for financial tracking.
- `audit`: Logs critical actions performed by users for accountability.
- `core`: Handles high-level organization settings (Singleton) and initial system setup.
- `reports`: Aggregates transaction and ledger data into summaries (Daily, Monthly, etc.).

### Installation & Setup
1.  **Environment**: Create a `.env` file in the `backend/` directory with:
    - `DATABASE_URL=postgres://user:password@localhost:5432/canteendb`
    - `DEBUG=1`
    - `SECRET_KEY=...`
2.  **Setup Commands**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver
    ```
3.  **Initial System Setup**:
    - When first accessing the app, navigate to `/setup` (if not auto-redirected) to enter organization details and create the first **Admin** account.

---

## 2. User Guide (User Manual)

### Getting Started
- **Accessing the App**: Open the URL (typically `http://localhost:5173`).
- **First Time?**: You will be prompted to set up the institution name and admin credentials.
- **Login**: Use your username and password to enter the system. Roles (Admin, Manager, Cashier) define what you can see.

### Point of Sale (POS)
1.  **Add Items**: Click food cards to add to the cart. Choose 'Full' or 'Half' portions.
2.  **Cart Management**: Adjust quantities using `+` or `-`. Clear the cart if needed.
3.  **Payment**:
    - **Cash**: Enter the amount received to calculate change.
    - **Credit**: Search for a student/teacher account. System checks if account exists.
    - **Mixed**: Pay partially in cash and the remainder on credit.
4.  **Token Printing**: Upon completion, the system generates **individual tokens** for each item. These are formatted for 80mm thermal printers.

### Credit Account Management
- **Tracking**: View all students and teachers in the "Accounts" section.
- **Statements**: View every transaction made by a specific person.
- **Settlement**: When a student pays their debt, use the "Settle Balance" button in their profile to record the payment and update their ledger.

### Menu & Inventory
- **Adding Items**: Upload images, set categories, and define pricing for different portions.
- **Price Control**: Update prices anytime; existing transactions remain unaffected (immutable receipts).

### Expenses & Cashbook
- **Record Expenses**: Track electricity, gas, or raw material purchases in the "Expenses" section.
- **Cash Balance**: The Cashbook automatically updates based on POS sales (income) and recorded expenses.

### Reports
- **Closing the Day**: Check if physical cash matches the "Cash on Hand" report.
- **Performance**: Analyze which food items are selling the most to optimize your menu.

---

## 3. Data Flow & Safety
- **Atomic Transactions**: Sales are processed using database atomicity. If any step (database save, balance update, or ledger entry) fails, the entire transaction is rolled back to prevent data corruption.
- **Immutable Receipts**: Once a transaction is made, a JSON "Receipt Payload" is stored in the database. Even if prices change later, the original receipt remains an accurate record of that sale.

---

## 4. Administration
- **Organization Settings**: Change the school name or address via the Admin dashboard. This updates what prints on the tokens.
- **User Management**: Admins can create and deactivate staff accounts.

---
**Prepared by:** Antigravity AI
**Date:** December 21, 2025
