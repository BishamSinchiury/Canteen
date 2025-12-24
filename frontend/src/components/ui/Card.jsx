import React from 'react'
import styles from './Card.module.css'

/**
 * Card component for content containers
 */
export default function Card({
    children,
    className = '',
    hover = false,
    ...props
}) {
    const classes = [
        styles.card,
        hover && styles.cardHover,
        className
    ].filter(Boolean).join(' ')

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    )
}

export function CardHeader({ title, subtitle, children, className = '' }) {
    return (
        <div className={`${styles.cardHeader} ${className}`}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
            {children}
        </div>
    )
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`${styles.cardBody} ${className}`}>
            {children}
        </div>
    )
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`${styles.cardFooter} ${className}`}>
            {children}
        </div>
    )
}

/**
 * StatCard - for dashboard statistics
 */
export function StatCard({
    label,
    value,
    icon,
    iconVariant = 'primary',
    change,
    changeType,
    className = ''
}) {
    const iconClasses = [
        styles.statIcon,
        styles[`statIcon${iconVariant.charAt(0).toUpperCase() + iconVariant.slice(1)}`]
    ].join(' ')

    return (
        <div className={`${styles.card} ${styles.statCard} ${className}`}>
            <div className={styles.statContent}>
                <div className={styles.statLabel}>{label}</div>
                <div className={styles.statValue}>{value}</div>
                {change && (
                    <div className={`${styles.statChange} ${changeType === 'up' ? styles.statUp : styles.statDown}`}>
                        {changeType === 'up' ? '↑' : '↓'} {change}
                    </div>
                )}
            </div>
            {icon && (
                <div className={iconClasses}>
                    {icon}
                </div>
            )}
        </div>
    )
}
