import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'
import { AuthContext } from '../context/AuthContext'

const menuConfig = {
  admin: [
    { section: 'Main' },
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/pos', label: 'POS / New Order', icon: '🛒' },
    { to: '/transactions', label: 'Transactions', icon: '📋' },
    { section: 'Inventory' },
    { to: '/inventory/vendors', label: 'Vendors', icon: '🏪' },
    { to: '/inventory/ingredients', label: 'Stock', icon: '📦' },
    { to: '/inventory/recipes', label: 'Recipes', icon: '📖' },
    { to: '/inventory/purchase-orders', label: 'Orders', icon: '📄' },
    { section: 'Management' },
    { to: '/menu', label: 'Menu Items', icon: '🍽️' },
    { to: '/accounts/students', label: 'Student Accounts', icon: '🎓' },
    { to: '/accounts/teachers', label: 'Teacher Accounts', icon: '👨‍🏫' },
    { section: 'Finance' },
    { to: '/cashbook', label: 'Cashbook', icon: '💵' },
    { to: '/expenses', label: 'Expenses', icon: '📤' },
    { to: '/reports', label: 'Reports', icon: '📈' },
    { section: 'Admin' },
    { to: '/users', label: 'Users', icon: '👥' },
  ],
  manager: [
    { section: 'Main' },
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/pos', label: 'POS / New Order', icon: '🛒' },
    { to: '/transactions', label: 'Transactions', icon: '📋' },
    { section: 'Inventory' },
    { to: '/inventory/vendors', label: 'Vendors', icon: '🏪' },
    { to: '/inventory/ingredients', label: 'Stock', icon: '📦' },
    { to: '/inventory/recipes', label: 'Recipes', icon: '📖' },
    { to: '/inventory/purchase-orders', label: 'Orders', icon: '📄' },
    { section: 'Management' },
    { to: '/menu', label: 'Menu Items', icon: '🍽️' },
    { to: '/accounts/students', label: 'Student Accounts', icon: '🎓' },
    { to: '/accounts/teachers', label: 'Teacher Accounts', icon: '👨‍🏫' },
    { section: 'Finance' },
    { to: '/cashbook', label: 'Cashbook', icon: '💵' },
    { to: '/expenses', label: 'Expenses', icon: '📤' },
    { to: '/reports', label: 'Reports', icon: '📈' },
  ],
  cashier: [
    { section: 'Main' },
    { to: '/pos', label: 'POS / New Order', icon: '🛒' },
    { to: '/transactions', label: 'Transactions', icon: '📋' },
    { to: '/menu', label: 'Menu (View)', icon: '🍽️' },
  ]
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useContext(AuthContext)
  const role = user?.role || 'cashier'
  const items = menuConfig[role] || menuConfig.cashier

  const sidebarClass = `${styles.sidebar} ${collapsed ? styles.collapsed : ''}`

  return (
    <aside className={sidebarClass} aria-label="Main navigation">
      <div className={styles.logo}>
        <div className={styles.logoIcon}>🍽️</div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>EECOHM</span>
          <span className={styles.logoSubtitle}>Canteen System</span>
        </div>
      </div>

      <nav id="sidebar-menu" className={styles.menu}>
        {items.map((item, idx) => (
          item.section ? (
            <div key={idx} className={styles.menuSection}>{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? `${styles.item} ${styles.active}` : styles.item
              }
              end={item.to === '/'}
            >
              <span className={styles.icon} aria-hidden>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          )
        ))}
      </nav>

      <button
        className={styles.collapseBtn}
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls="sidebar-menu"
      >
        {collapsed ? '→' : '← Collapse'}
      </button>
    </aside>
  )
}
