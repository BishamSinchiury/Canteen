import React, { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Login.module.css'
import { AuthContext } from '../context/AuthContext'
import Input from './ui/Input'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { user, login } = useContext(AuthContext)
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>🍽️</div>
          <h1 className={styles.schoolName}>EECOHM School of Excellence</h1>
          <p className={styles.schoolAddress}>Birtamode-1, Jhapa</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to access the Canteen Management System</p>

          {error && (
            <div className={styles.error}>
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              icon={<span>👤</span>}
            />
          </div>

          <div className={styles.formGroup}>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              icon={<span>🔒</span>}
            />
          </div>

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <span className="spinner" /> Signing in...
              </>
            ) : (
              <>
                Sign In <span>→</span>
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          Canteen Management System v1.0 • © 2024 EECOHM
        </div>
      </div>
    </div>
  )
}
