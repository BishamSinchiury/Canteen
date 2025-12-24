# EECOHM V2 Canteen Management System - User Manual

Welcome to the official user manual for the **EECOHM V2 Canteen Management System**. This document provides comprehensive instructions on how to use every feature of the application effectively.

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
   - [Login](#login)
   - [User Roles](#user-roles)
3. [Dashboard](#3-dashboard)
4. [Point of Sale (POS)](#4-point-of-sale-pos)
   - [Interface Overview](#interface-overview)
   - [Making a Sale](#making-a-sale)
   - [Payment Methods (Cash/Credit)](#payment-methods)
   - [Receipt Printing](#receipt-printing)
5. [Menu Management](#5-menu-management)
   - [Adding Items](#adding-items)
   - [Managing Portions](#managing-portions)
6. [Account Management](#6-account-management)
   - [System Users](#system-users)
   - [Student & Teacher Accounts](#student--teacher-accounts)
7. [Transactions & Ledgers](#7-transactions--ledgers)
   - [Transaction History](#transaction-history)
   - [Cashbook & Expenses](#cashbook--expenses)
8. [Reports](#8-reports)

---

## 1. Introduction
The Canteen Management System is designed to streamline operations at the EECOHM School canteen. It handles inventory (menu), sales (POS), credit accounts for students/teachers, and financial tracking.

## 2. Getting Started

### Login
1. Open the application in your web browser.
2. You will see the **Login Screen**.
3. Enter your **Username** and **Password**.
4. Click **"Login"**.

**Default Super Admin Credentials:**
- **Username:** `Bisham`
- **Password:** `Bisham@0411`
*(Note: Please ensure you change passwords for production use)*

### User Roles
The system supports multiple user roles, each with different permissions:
- **Admin**: Full access to all features, including system settings and user management.
- **Manager**: Access to reports, menu, transactions, and inventory. Cannot manage system users.
- **Cashier**: Restricted access limited to POS and viewing daily transactions.

---

## 3. Dashboard
Upon logging in, you are greeted by the Dashboard. This is your command center.

**Key Features:**
- **Quick Statistics**: Cards showing 'Today\'s Sales', 'Active Orders', and 'Monthly Revenue' at a glance.
- **Recent Activity**: A list of the most recent transactions processed.
- **Quick Actions**: Buttons to jump immediately to 'New Sale (POS)', 'Add Expense', or 'View Reports'.

---

## 4. Point of Sale (POS)
The POS module is where daily sales operations happen.

### Interface Overview
- **Left Panel (Menu)**: Displays all available food items. You can filter by category (Breakfast, Lunch, Snacks, Beverages) using the tabs at the top or use the **Search Bar** to find items quickly.
- **Right Panel (Cart)**: Shows the current order details, including items selected, quantities, portions (Full/Half), and the total amount.

### Making a Sale
1. **Select Items**: Click on a food item card in the left panel.
2. **Choose Portion**: If applicable, a popup will ask for the portion size ('Full' or 'Half'). Select one.
3. **Adjust Quantity**: In the cart (right panel), use the `+` and `-` buttons to adjust quantity. Use the `Trash` icon to remove an item.
4. **Checkout**: When ready, click the large green **"Checkout"** button at the bottom right.

### Payment Methods
After clicking Checkout, the Payment Modal appears:

#### **A. Cash Payment**
1. Select **"Cash"** as the payment method.
2. **Tendered Amount**: Enter the amount given by the customer. The system will automatically calculate the **Change** to be returned.
3. Click **"Confirm Payment"**.

#### **B. Credit Payment (Student/Teacher)**
1. Select **"Credit"** as the payment method.
2. **Search Account**: Type the name or ID of the Student/Teacher.
3. Select the correct account from the dropdown list.
4. The system verifies their current balance and credit limit.
5. Click **"Confirm Payment"** to charge it to their account.

### Receipt Printing
- Once the payment is successful, a **Receipt Preview** appears.
- Click **"Print"** to send it to the connected thermal printer.
- Press `Esc` or click **"Close"** to return to the POS for the next customer.

---

## 5. Menu Management
Navigate to the **Menu** page to manage food offerings.

### Adding Items
1. Click **"+ Add Item"** button.
2. Fill in the details:
   - **Name**: e.g., "Chicken Momo".
   - **Category**: Main Course, Snack, etc.
   - **Price (Full/Half)**: Set prices for available portions.
   - **Availability**: Toggle whether the item is currently in stock.
3. Click **"Save"**.

### Managing Portions
- Items can be set to have just a 'Full' portion or both 'Full' and 'Half'.
- Use the edit icon specific to an item to change these settings later.

---

## 6. Account Management

### System Users
*(Admin Only)*
- Go to the **Users** page.
- Create accounts for new Cashiers or Managers.
- Reset passwords for staff members.

### Student & Teacher Accounts
Navigate to **"Student Accounts"** or **"Teacher Accounts"**.
- **Credit Profile**: Click on a name to view their full transaction history and current debt.
- **Settle Debt**: To pay off a debt:
  1. Open the user's profile.
  2. Click **"Settle Balance"**.
  3. Enter the amount they are paying off.
  4. Confirm the transaction. This reduces their outstanding balance.

---

## 7. Transactions & Ledgers

### Transaction History
- The **Transactions** page lists every sale ever made.
- You can **Filter** by date range, cashier, or payment type.
- Click on any row to view the full details of that receipt.

### Cashbook & Expenses
- **Cashbook**: Tracks the physical cash in the drawer.
- **Expenses**: Record daily operational costs (e.g., buying vegetables, gas refill).
  1. Click **"Add Expense"**.
  2. Enter Description and Amount.
  3. This will be deducted from your "Net Cash Details" in reports.

---

## 8. Reports
Used for end-of-day closing and monthly analysis.
- **Daily Report**: Summary of Total Sales (Cash vs Credit), Total Expenses, and Net Cash in Hand.
- **Sales by Item**: Shows which items are performing best (e.g., "Sold 50 plates of Momo today").
- **Export**: Options to export data to CSV/Excel for external accounting.

---

### Technical Support
If the system behaves unexpectedly:
1. Refresh the page (Ctrl + R).
2. Check your internet connection (though the app works locally, it needs network for database access).
3. Contact the System Administrator (Bisham).

**(c) 2025 EECOHM School of Excellence**
