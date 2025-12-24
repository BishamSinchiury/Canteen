import React, { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './NavBar.module.css'
import { AuthContext } from '../context/AuthContext'

export default function NavBar() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const [dateTime, setDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const roleLabels = {
    admin: 'Administrator',
    manager: 'Manager',
    cashier: 'Cashier'
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        <button className={styles.mobileMenuBtn} aria-label="Menu">
          ☰
        </button>
        <div className={styles.breadcrumb}>
          EECOHM School of Excellence • Birtamode-1, Jhapa
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.dateTime}>
          <span className={styles.dateTimeIcon}>📅</span>
          <span>{formatDate(dateTime)}</span>
          <span>•</span>
          <span>{formatTime(dateTime)}</span>
        </div>

        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {getInitials(user?.full_name || user?.username)}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>
              {user?.full_name || user?.username}
            </span>
            <span className={styles.userRole}>
              {roleLabels[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Logout"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}
