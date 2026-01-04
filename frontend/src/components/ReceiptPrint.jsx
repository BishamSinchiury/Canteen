import React, { forwardRef } from 'react'
import styles from './ReceiptPrint.module.css'

/**
 * Receipt Print Component - Thermal printer friendly (80mm width)
 */
const ReceiptPrint = forwardRef(({ payload }, ref) => {
  console.log('ReceiptPrint received:', payload)
  if (!payload || !payload.items || payload.items.length === 0) {
    console.log('ReceiptPrint: Invalid payload, returning null')
    return null
  }

  const { institution, transaction_id, date, items, payment } = payload

  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Render a token for each item
  return (
    <div className={styles.receipt} ref={ref}>
      {items.map((item, index) => (
        <div key={index} className={styles.tokenPage}>
          {/* Header */}
          <div className={styles.receiptHeader}>
            <h1 className={styles.schoolName}>{institution?.name || 'EECOHM School of Excellence'}</h1>
            <p className={styles.schoolAddress}>{institution?.address || 'Birtamode 1, Jhapa'}</p>
          </div>

          {/* Token Info */}
          <div className={styles.token}>
            TOKEN #{transaction_id}-{index + 1}
          </div>

          {/* Core Details */}
          <div className={styles.receiptMeta}>
            <div className={styles.metaRow}>
              <span>Date:</span>
              <span>{formatDate(date)} {formatTime(date)}</span>
            </div>
            <div className={styles.metaRow}>
              <span>Tx ID:</span>
              <span>#{transaction_id}</span>
            </div>
            <div className={styles.metaRow}>
              <span>Payment:</span>
              <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{payment?.type}</span>
            </div>
            {payload.account_name && (
              <div className={styles.metaRow}>
                <span>Account:</span>
                <span style={{ fontWeight: 'bold', maxWidth: '120px', textAlign: 'right', wordBreak: 'break-word' }}>{payload.account_name}</span>
              </div>
            )}
            {payload.cash_paid && (
              <div className={styles.metaRow}>
                <span>Cash Paid:</span>
                <span>Rs. {parseFloat(payload.cash_paid).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          {/* Item Details */}
          <div style={{ margin: '10px 0' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
              {item.name}
            </div>
            <div className={styles.metaRow}>
              <span>Portion:</span>
              <span>{item.portion}</span>
            </div>
            <div className={styles.metaRow} style={{ marginTop: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>Quantity:</span>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.quantity}</span>
            </div>
            <div className={styles.metaRow} style={{ marginTop: '4px' }}>
              <span>Total Amount:</span>
              <span>Rs. {item.line_total?.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Footer */}
          <div className={styles.footer} style={{ marginTop: '5px', paddingTop: '5px', border: 'none' }}>
            <p className={styles.footerNote} style={{ fontSize: '9px' }}>Keep this token for order collection</p>
          </div>
        </div>
      ))}
    </div>
  )
})

ReceiptPrint.displayName = 'ReceiptPrint'

export default ReceiptPrint
