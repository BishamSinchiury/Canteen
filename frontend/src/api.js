/**
 * API Service for EECOHM Canteen Management System
 */

const API_BASE = import.meta.env.VITE_API_BASE || ''

function getToken() {
  return localStorage.getItem('token')
}

/**
 * Generic fetch wrapper with auth and error handling
 */
export async function apiFetch(path, options = {}) {
  const headers = options.headers || {}
  const token = getToken()

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }))
    const err = new Error(data.detail || 'API error')
    err.status = res.status
    err.data = data
    throw err
  }

  // Handle empty responses
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return res.json().catch(() => null)
  }
  return null
}

// ============ Authentication ============

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Login failed')
  }

  const data = await res.json()
  localStorage.setItem('token', data.access)
  localStorage.setItem('refresh', data.refresh)
  return data
}

export async function refreshToken() {
  const refresh = localStorage.getItem('refresh')
  if (!refresh) throw new Error('No refresh token')

  const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  })

  if (!res.ok) throw new Error('Token refresh failed')

  const data = await res.json()
  localStorage.setItem('token', data.access)
  return data
}

// ============ Food Items / Menu ============

export async function fetchFoodItems(params = '') {
  return apiFetch(`/api/food-items/${params}`)
}

export async function createFoodItem(data) {
  // Support both FormData (with image) and JSON
  const body = data instanceof FormData ? data : JSON.stringify(data)
  return apiFetch('/api/food-items/', {
    method: 'POST',
    body
  })
}

export async function updateFoodItem(id, data) {
  // Support both FormData (with image) and JSON
  const body = data instanceof FormData ? data : JSON.stringify(data)
  return apiFetch(`/api/food-items/${id}/`, {
    method: 'PATCH',
    body
  })
}

export async function deleteFoodItem(id) {
  return apiFetch(`/api/food-items/${id}/`, { method: 'DELETE' })
}

export async function toggleFoodItemActive(id) {
  return apiFetch(`/api/food-items/${id}/toggle_active/`, { method: 'POST' })
}

export async function fetchCategories() {
  return apiFetch('/api/food-items/categories/')
}

// ============ Transactions ============

export async function fetchTransactions(params = '') {
  return apiFetch(`/api/transactions/${params}`)
}

export async function fetchTransaction(id) {
  return apiFetch(`/api/transactions/${id}/`)
}

export async function createTransaction(payload) {
  return apiFetch('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function cancelTransaction(id) {
  return apiFetch(`/api/transactions/${id}/cancel/`, { method: 'POST' })
}

export async function getReceipt(txId) {
  return apiFetch(`/api/transactions/${txId}/receipt/`)
}

export async function exportTransactions(params = '') {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/transactions/export_csv/${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.blob()
}

// ============ Credit Accounts ============

export async function fetchAccounts(params = '') {
  return apiFetch(`/api/accounts/${params}`)
}

export async function fetchAccount(id) {
  return apiFetch(`/api/accounts/${id}/`)
}

export async function createAccount(data) {
  return apiFetch('/api/accounts/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateAccount(id, data) {
  return apiFetch(`/api/accounts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export async function deleteAccount(id) {
  return apiFetch(`/api/accounts/${id}/`, { method: 'DELETE' })
}

export async function chargeAccount(id, amount, description = '') {
  return apiFetch(`/api/accounts/${id}/charge/`, {
    method: 'POST',
    body: JSON.stringify({ amount, description })
  })
}

export async function paymentAccount(id, amount, description = '') {
  return apiFetch(`/api/accounts/${id}/payment/`, {
    method: 'POST',
    body: JSON.stringify({ amount, description })
  })
}

export async function getAccountStatement(id) {
  return apiFetch(`/api/accounts/${id}/statement/`)
}

// ============ Users ============

export async function fetchUsers(params = '') {
  return apiFetch(`/api/users/${params}`)
}

export async function createUser(data) {
  return apiFetch('/api/users/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateUser(id, data) {
  return apiFetch(`/api/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export async function deleteUser(id) {
  return apiFetch(`/api/users/${id}/`, { method: 'DELETE' })
}

// ============ Cashbook ============

export async function fetchCashbook(params = '') {
  return apiFetch(`/api/cashbook/${params}`)
}

export async function getCashbookSummary() {
  return apiFetch('/api/cashbook/summary/')
}

export async function createCashbookEntry(data) {
  return apiFetch('/api/cashbook/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// ============ Expenses ============

export async function fetchExpenses(params = '') {
  return apiFetch(`/api/expenses/${params}`)
}

export async function createExpense(data) {
  return apiFetch('/api/expenses/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateExpense(id, data) {
  return apiFetch(`/api/expenses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export async function deleteExpense(id) {
  return apiFetch(`/api/expenses/${id}/`, { method: 'DELETE' })
}

export async function getExpenseCategories() {
  return apiFetch('/api/expenses/categories/')
}

export async function getExpenseSummary() {
  return apiFetch('/api/expenses/summary/')
}

// ============ Reports ============

export async function getDailySummary(date = null) {
  const params = date ? `?date=${date}` : ''
  return apiFetch(`/api/reports/daily/${params}`)
}

export async function getMonthlySummary(year, month) {
  return apiFetch(`/api/reports/monthly/?year=${year}&month=${month}`)
}

export async function getCustomReport(params) {
  const queryString = new URLSearchParams(params).toString()
  return apiFetch(`/api/reports/custom/?${queryString}`)
}

export async function getOutstandingCredit() {
  return apiFetch('/api/reports/outstanding-credit/')
}

export async function getCashOnHand() {
  return apiFetch('/api/reports/cash-on-hand/')
}

export async function exportAccountStatement(accountId) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/reports/account-statement/${accountId}/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.blob()
}

// Excel Exports
export async function exportDailySummaryExcel(date = null) {
  const params = date ? `?date=${date}&export=excel` : '?export=excel'
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/reports/daily/${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}

export async function exportMonthlySummaryExcel(year, month) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/reports/monthly/?year=${year}&month=${month}&export=excel`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}

export async function exportTransactionsExcel(filters = {}) {
  const params = new URLSearchParams(filters).toString()
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/transactions/export_excel/?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}

// ============ System Setup ============

export async function getSetupStatus() {
  return apiFetch('/api/core/setup/')
}

export async function completeSetup(data) {
  return apiFetch('/api/core/setup/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
// ============ Inventory ============

export async function fetchVendors(params = '') {
  return apiFetch(`/api/inventory/vendors/${params}`)
}

export async function createVendor(data) {
  return apiFetch('/api/inventory/vendors/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateVendor(id, data) {
  return apiFetch(`/api/inventory/vendors/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export async function fetchIngredients(params = '') {
  return apiFetch(`/api/inventory/ingredients/${params}`)
}

export async function createIngredient(data) {
  // Support both FormData (with image) and JSON
  const body = data instanceof FormData ? data : JSON.stringify(data)
  return apiFetch('/api/inventory/ingredients/', {
    method: 'POST',
    body
  })
}

export async function updateIngredient(id, data) {
  // Support both FormData (with image) and JSON
  const body = data instanceof FormData ? data : JSON.stringify(data)
  return apiFetch(`/api/inventory/ingredients/${id}/`, {
    method: 'PATCH',
    body
  })
}

export async function adjustStock(id, data) {
  return apiFetch(`/api/inventory/ingredients/${id}/adjust_stock/`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function fetchStockMovements(params = '') {
  return apiFetch(`/api/inventory/movements/${params}`)
}

export async function fetchRecipes(params = '') {
  return apiFetch(`/api/inventory/recipes/${params}`)
}

export async function fetchRecipe(id) {
  return apiFetch(`/api/inventory/recipes/${id}/`)
}

export async function createRecipe(data) {
  return apiFetch('/api/inventory/recipes/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function setRecipeIngredients(id, ingredients) {
  return apiFetch(`/api/inventory/recipes/${id}/set_ingredients/`, {
    method: 'POST',
    body: JSON.stringify({ ingredients })
  })
}

export async function fetchPurchaseOrders(params = '') {
  return apiFetch(`/api/inventory/purchase-orders/${params}`)
}

export async function createPurchaseOrder(data) {
  return apiFetch('/api/inventory/purchase-orders/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function receiveStock(id, items) {
  return apiFetch(`/api/inventory/purchase-orders/${id}/receive_stock/`, {
    method: 'POST',
    body: JSON.stringify({ items })
  })
}
