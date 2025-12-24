import React from 'react'
import styles from './Input.module.css'

/**
 * Input component with label, error state, and icon support
 */
export default function Input({
    label,
    error,
    icon,
    size = 'md',
    required = false,
    className = '',
    type = 'text',
    textarea = false,
    ...props
}) {
    const wrapperClasses = [
        styles.inputWrapper,
        error && styles.error,
        size !== 'md' && styles[size],
        className
    ].filter(Boolean).join(' ')

    const containerClasses = [
        styles.inputContainer,
        icon && styles.hasIcon
    ].filter(Boolean).join(' ')

    const InputComponent = textarea ? 'textarea' : 'input'
    const inputClasses = [
        styles.input,
        textarea && styles.textarea
    ].filter(Boolean).join(' ')

    return (
        <div className={wrapperClasses}>
            {label && (
                <label className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}
            <div className={containerClasses}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <InputComponent
                    className={inputClasses}
                    type={!textarea ? type : undefined}
                    {...props}
                />
            </div>
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    )
}

/**
 * Select component styled like Input
 */
export function Select({
    label,
    error,
    required = false,
    className = '',
    children,
    ...props
}) {
    const wrapperClasses = [
        styles.inputWrapper,
        error && styles.error,
        className
    ].filter(Boolean).join(' ')

    return (
        <div className={wrapperClasses}>
            {label && (
                <label className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}
            <select className={styles.input} {...props}>
                {children}
            </select>
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    )
}
