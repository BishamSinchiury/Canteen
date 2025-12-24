import React from 'react'
import styles from './Button.module.css'

/**
 * Button component with multiple variants and sizes
 * @param {Object} props
 * @param {'primary'|'secondary'|'success'|'danger'|'warning'|'ghost'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {boolean} props.fullWidth
 * @param {boolean} props.loading
 * @param {boolean} props.disabled
 * @param {string} props.className
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} props.icon
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    className = '',
    children,
    icon,
    ...props
}) {
    const classes = [
        styles.button,
        styles[variant],
        size !== 'md' && styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        !children && icon && styles.iconOnly,
        className
    ].filter(Boolean).join(' ')

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className={styles.spinner} />}
            {icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </button>
    )
}
