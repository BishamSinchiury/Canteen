import React, { createContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, refreshToken, apiFetch } from '../api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        // Invalid stored user, clear it
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)

    let userData;
    if (data.user) {
      userData = {
        token: data.access,
        username: data.user.username,
        role: data.user.role,
        full_name: data.user.full_name,
      }
    } else {
      let role = 'cashier'
      if (username === 'admin') role = 'admin'
      else if (username === 'manager' || username === 'mgr') role = 'manager'

      userData = {
        token: data.access,
        username,
        role,
        full_name: username.charAt(0).toUpperCase() + username.slice(1)
      }
    }

    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)

    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  // Token refresh logic could be added here
  useEffect(() => {
    const handleRefresh = async () => {
      try {
        await refreshToken()
      } catch {
        // Refresh failed, user needs to re-login
        logout()
      }
    }

    // Optionally set up token refresh interval
    // const interval = setInterval(handleRefresh, 1000 * 60 * 30) // Every 30 mins
    // return () => clearInterval(interval)
  }, [logout])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
