# EECOHM Canteen Management System - Implementation Plan

## Overview
Complete canteen management system for EECOHM School of Excellence with POS, account management, reporting, and receipt printing.

---

## Phase 1: Backend Enhancements

### 1.1 Audit Logging System
- [ ] Create AuditLog model
- [ ] Implement signal handlers for model changes  
- [ ] Track create/update/delete operations

### 1.2 Enhanced Permissions
- [ ] Add IsManagerOrAdmin permission class
- [ ] Refine permissions per viewset
- [ ] Add object-level permissions where needed

### 1.3 Enhanced Account Management
- [ ] Add account charge endpoint
- [ ] Add account payment endpoint
- [ ] Add account statement endpoint
- [ ] Add account transaction history

### 1.4 Advanced Filtering & Pagination
- [ ] Transaction filters: date range, month, cashier, food_item, payment_type
- [ ] FoodItem filters: name, category, is_active
- [ ] Account filters: name, account_id, balance threshold
- [ ] Add pagination to all list endpoints

### 1.5 Reports Endpoints
- [ ] Daily summary endpoint (exists, enhance)
- [ ] Monthly summary endpoint
- [ ] Custom date range summary
- [ ] Top selling items report
- [ ] Cash vs credit breakdown
- [ ] CSV export endpoint for transactions
- [ ] CSV export for account statements

### 1.6 Transaction Enhancements
- [ ] Transaction cancellation with balance reversal
- [ ] Audit log on cancel
- [ ] Handle mixed payment split amounts

### 1.7 Seed Data
- [ ] Create management command for sample data
- [ ] Users: admin, manager, cashier
- [ ] Sample food items
- [ ] Sample accounts
- [ ] Sample transactions

---

## Phase 2: Frontend UI Component System

### 2.1 Core Components
- [ ] Button.jsx with variants (primary, secondary, danger)
- [ ] Input.jsx (text, number, password)
- [ ] Select.jsx / Dropdown
- [ ] DatePicker.jsx
- [ ] Modal.jsx
- [ ] Table.jsx
- [ ] Card.jsx
- [ ] Badge.jsx
- [ ] Toast.jsx / Alert notifications
- [ ] Loader.jsx / Spinner
- [ ] Pagination.jsx
- [ ] Tabs.jsx
- [ ] SearchInput.jsx

### 2.2 Design System (CSS Variables)
- [ ] Color tokens (primary, success, warning, danger)
- [ ] Typography scale
- [ ] Spacing scale
- [ ] Border radius tokens
- [ ] Shadow tokens
- [ ] Transition tokens

---

## Phase 3: Frontend Pages

### 3.1 Authentication
- [ ] Enhanced Login page with premium styling
- [ ] Redirect logic after login
- [ ] Protected route component

### 3.2 Dashboard
- [ ] Summary cards (Today's Sales, Cash, Credit, Transactions)
- [ ] Quick action buttons
- [ ] Recent transactions list
- [ ] Top selling items chart/list

### 3.3 POS / New Order (Enhance existing)
- [ ] Split layout: menu grid + cart
- [ ] Category filter
- [ ] Search filter
- [ ] Quantity +/- controls
- [ ] Payment method selector with account search
- [ ] Mixed payment modal
- [ ] Success state with receipt print

### 3.4 Menu Management
- [ ] Table view with sorting
- [ ] Add/Edit modal
- [ ] Active/inactive toggle
- [ ] Category management
- [ ] Search/filter

### 3.5 Transactions Page (Enhance)
- [ ] Filter panel (date range, month, cashier, payment type, food item)
- [ ] Table with all transaction details
- [ ] Transaction detail modal/page
- [ ] Re-print receipt button
- [ ] Export CSV button

### 3.6 Account Management
- [ ] Student Accounts page
- [ ] Teacher Accounts page
- [ ] Account list with balance indicators
- [ ] Add/Edit account modal
- [ ] Account detail page with:
  - Transaction history
  - Current balance
  - Charge account (add credit)
  - Receive payment (reduce balance)
- [ ] Account statement export

### 3.7 Cashbook & Expenses
- [ ] Income list
- [ ] Expense list
- [ ] Add expense modal
- [ ] Daily/Monthly balance summary
- [ ] Reconciliation view

### 3.8 Reports
- [ ] Date range selector
- [ ] Filter options
- [ ] Summary cards display
- [ ] Table with detailed data
- [ ] Export buttons (CSV)

### 3.9 User Management (Admin only)
- [ ] User list
- [ ] Add/Edit user modal
- [ ] Role assignment
- [ ] Active/inactive toggle

### 3.10 Settings
- [ ] Basic settings page placeholder

---

## Phase 4: Receipt Printing

### 4.1 Receipt Component (Enhance)
- [ ] Thermal printer friendly (80mm width)
- [ ] A4 print option
- [ ] All required fields displayed
- [ ] Clean, minimal styling for print

### 4.2 Print Flow
- [ ] Auto-open print dialog on transaction success
- [ ] Re-print from transaction detail

---

## Phase 5: Testing

### 5.1 Backend Tests
- [ ] Transaction creation tests
- [ ] Balance update tests
- [ ] Atomicity tests
- [ ] Permission tests
- [ ] API endpoint tests

### 5.2 Frontend Tests
- [ ] Component unit tests
- [ ] Basic integration tests

---

## Phase 6: Documentation

### 6.1 README Updates
- [ ] Setup instructions
- [ ] Environment variables
- [ ] API documentation pointers

### 6.2 API Documentation
- [ ] Postman collection
- [ ] curl examples
- [ ] Swagger/OpenAPI

---

## Technical Notes

### Color Palette
- Primary: #1e3a5f (Dark Blue)
- Secondary: #2d5a87 (Medium Blue)
- Success: #10b981 (Green)
- Warning: #f59e0b (Amber)
- Danger: #ef4444 (Red)
- Background: #f8fafc (Light gray)
- Card Background: #ffffff
- Text Primary: #1e293b
- Text Secondary: #64748b

### Typography
- Font Family: 'Inter', system-ui, sans-serif
- Headers: 600-700 weight
- Body: 400 weight

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
