import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './components/Login'
import { ToastProvider, Loader } from './components/ui/Badge'
import {
  Dashboard,
  POS,
  Transactions,
  TransactionDetail,
  MenuManagement,
  StudentAccounts,
  TeacherAccounts,
  AccountDetail,
  Cashbook,
  Expenses,
  Reports,
  Users,
  Setup,
  Vendors,
  Ingredients,
  Recipes,
  PurchaseOrders
} from './pages'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />

            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/pos" element={<Layout><POS /></Layout>} />
            <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
            <Route path="/transactions/:id" element={<Layout><TransactionDetail /></Layout>} />
            <Route path="/menu" element={<Layout><MenuManagement /></Layout>} />
            <Route path="/accounts/students" element={<Layout><StudentAccounts /></Layout>} />
            <Route path="/accounts/teachers" element={<Layout><TeacherAccounts /></Layout>} />
            <Route path="/accounts/:id" element={<Layout><AccountDetail /></Layout>} />
            <Route path="/cashbook" element={<Layout><Cashbook /></Layout>} />
            <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
            <Route path="/reports" element={<Layout><Reports /></Layout>} />
            <Route path="/users" element={<Layout><Users /></Layout>} />

            <Route path="/inventory/vendors" element={<Layout><Vendors /></Layout>} />
            <Route path="/inventory/ingredients" element={<Layout><Ingredients /></Layout>} />
            <Route path="/inventory/recipes" element={<Layout><Recipes /></Layout>} />
            <Route path="/inventory/purchase-orders" element={<Layout><PurchaseOrders /></Layout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
