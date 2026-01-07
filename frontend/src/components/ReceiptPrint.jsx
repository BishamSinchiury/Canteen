import React, { forwardRef } from 'react'
import '../pages/Print.css' // Import global styles from pages folder

const ReceiptPrint = forwardRef(({ payload }, ref) => {
  if (!payload || !payload.items || payload.items.length === 0) {
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

  return (
    <div ref={ref} className="thermal-receipt"> {/* Global class */}
      {items.map((item, index) => (
        <div key={index} style={{ pageBreakAfter: 'always', paddingBottom: '10px' }}>

          {/* Header */}
          <div className="center">
            <h1>{institution?.name || 'EECOHM School'}</h1>
            <p style={{ fontSize: '10px' }}>{institution?.address || 'Birtamode 1, Jhapa'}</p>
          </div>

          <div className="divider" />

          {/* Token Info */}
          <div className="center bold" style={{ fontSize: '14px', margin: '5px 0' }}>
            TOKEN #{transaction_id}-{index + 1}
          </div>

          <div className="divider" />

          {/* Meta */}
          <div className="row">
            <span>Date:</span>
            <span>{formatDate(date)} {formatTime(date)}</span>
          </div>
          <div className="row">
            <span>Tx ID:</span>
            <span>#{transaction_id}</span>
          </div>
          <div className="row">
            <span>Payment:</span>
            <span className="bold" style={{ textTransform: 'uppercase' }}>{payment?.type}</span>
          </div>
          {payload.account_name && (
            <div className="row">
              <span>Account:</span>
              <span className="bold">{payload.account_name}</span>
            </div>
          )}
          {payload.cash_paid && (
            <div className="row">
              <span>Cash Paid:</span>
              <span>Rs. {parseFloat(payload.cash_paid).toFixed(2)}</span>
            </div>
          )}

          <div className="divider" />

          {/* Item Details */}
          <div style={{ margin: '5px 0' }}>
            <div className="bold" style={{ fontSize: '14px' }}>{item.name}</div>
            <div className="row">
              <span>Portion: {item.portion}</span>
              <span className="bold">Qty: {item.quantity}</span>
            </div>
            <div className="row">
              <span>Total:</span>
              <span>Rs. {item.line_total?.toFixed(2)}</span>
            </div>
          </div>

          <div className="divider" />

          <div className="center" style={{ fontSize: '10px', marginTop: '5px' }}>
            Keep for collection
          </div>
        </div>
      ))}
    </div>
  )
})

ReceiptPrint.displayName = 'ReceiptPrint'
export default ReceiptPrint
