import React, { Suspense, useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import NavBar from './NavBar'
import styles from './Layout.module.css'
import { AuthContext } from '../context/AuthContext'
import { Loader } from './ui/Badge'

export default function Layout({ children }) {
  const { user } = useContext(AuthContext)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  const gridClass = `${styles.appGrid} ${sidebarCollapsed ? styles.collapsed : ''}`

  return (
    <div className={gridClass}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={styles.mainArea}>
        <NavBar />
        <main className={styles.content}>
          <Suspense fallback={<Loader center size="lg" />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

/**
 * Page Header component for consistent page titles
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  )
}
