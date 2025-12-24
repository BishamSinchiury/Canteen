import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Badge.module.css'

/**
 * Badge component for status indicators
 */
export function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = ''
}) {
    const classes = [
        styles.badge,
        styles[variant],
        size !== 'md' && styles[size],
        className
    ].filter(Boolean).join(' ')

    return (
        <span className={classes}>
            {children}
        </span>
    )
}

/**
 * Loader/Spinner component
 */
export function Loader({ size = 'md', center = false }) {
    const classes = [
        styles.loader,
        size === 'sm' && styles.loaderSm,
        size === 'lg' && styles.loaderLg,
    ].filter(Boolean).join(' ')

    if (center) {
        return (
            <div className={styles.loaderCenter}>
                <div className={classes} />
            </div>
        )
    }

    return <div className={classes} />
}

// Toast Context
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((toast) => {
        const id = Date.now()
        setToasts(prev => [...prev, { ...toast, id }])

        // Auto remove after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, toast.duration || 5000)

        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const success = useCallback((message, title = 'Success') => {
        return addToast({ type: 'success', title, message })
    }, [addToast])

    const error = useCallback((message, title = 'Error') => {
        return addToast({ type: 'error', title, message })
    }, [addToast])

    const warning = useCallback((message, title = 'Warning') => {
        return addToast({ type: 'warning', title, message })
    }, [addToast])

    const info = useCallback((message, title = 'Info') => {
        return addToast({ type: 'info', title, message })
    }, [addToast])

    return (
        <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
            {children}
            {createPortal(
                <div className={styles.toastContainer}>
                    {toasts.map(toast => (
                        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}

function Toast({ type, title, message, onClose }) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    }

    const classes = [
        styles.toast,
        styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]
    ].join(' ')

    return (
        <div className={classes} role="alert">
            <span className={styles.toastIcon}>{icons[type]}</span>
            <div className={styles.toastContent}>
                <div className={styles.toastTitle}>{title}</div>
                {message && <div className={styles.toastMessage}>{message}</div>}
            </div>
            <button className={styles.toastClose} onClick={onClose} aria-label="Close">
                ×
            </button>
        </div>
    )
}

export default Badge
