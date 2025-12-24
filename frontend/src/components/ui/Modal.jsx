import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

/**
 * Modal component with header, body, and footer
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    size = 'md',
    children,
    footer,
    closeOnOverlay = true,
    closeOnEscape = true,
}) {
    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape' && closeOnEscape) {
            onClose()
        }
    }, [onClose, closeOnEscape])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, handleEscape])

    if (!isOpen) return null

    const modalClasses = [
        styles.modal,
        size === 'lg' && styles.modalLarge,
        size === 'xl' && styles.modalXLarge,
    ].filter(Boolean).join(' ')

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && closeOnOverlay) {
            onClose()
        }
    }

    const modalContent = (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={modalClasses} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className={styles.header}>
                    <h2 id="modal-title" className={styles.title}>{title}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                <div className={styles.body}>
                    {children}
                </div>
                {footer && (
                    <div className={styles.footer}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
