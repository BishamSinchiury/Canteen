import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { Button, Badge, Loader, useToast } from '../components/ui'
import Card, { CardBody } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { fetchTransaction, cancelTransaction, getReceipt } from '../api'
import { AuthContext } from '../context/AuthContext'
import ReceiptPrint from '../components/ReceiptPrint'
import styles from './common.module.css'
import receiptStyles from '../components/ReceiptPrint.module.css'

export default function TransactionDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useContext(AuthContext)
    const toast = useToast()

    const [transaction, setTransaction] = useState(null)
    const [receipt, setReceipt] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [canceling, setCanceling] = useState(false)

    useEffect(() => {
        loadTransaction()
    }, [id])

    async function loadTransaction() {
        try {
            const [txData, receiptData] = await Promise.all([
                fetchTransaction(id),
                getReceipt(id).catch(() => null)
            ])
            setTransaction(txData)
            setReceipt(receiptData)
        } catch (err) {
            toast.error('Failed to load transaction')
            navigate('/transactions')
        } finally {
            setLoading(false)
        }
    }

    async function handleCancel() {
        setCanceling(true)
        try {
            await cancelTransaction(id)
            toast.success('Transaction canceled successfully')
            loadTransaction()
        } catch (err) {
            toast.error(err.message || 'Failed to cancel transaction')
        } finally {
            setCanceling(false)
            setShowCancelModal(false)
        }
    }

    function handlePrint() {
        if (receipt?.payload) {
            window.print()
        }
    }

    if (loading) {
        return <Loader center size="lg" />
    }

    if (!transaction) {
        return <div>Transaction not found</div>
    }

    const formatCurrency = (amount) => `Rs. ${parseFloat(amount || 0).toFixed(2)}`
    const formatDate = (timestamp) => new Date(timestamp).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <div>
            <PageHeader
                title={`Transaction #${transaction.id}`}
                subtitle={formatDate(transaction.timestamp)}
                actions={
                    <>
                        <Button variant="secondary" onClick={() => navigate('/transactions')}>← Back</Button>
                        {receipt && <Button variant="secondary" onClick={handlePrint}>🖨️ Print Receipt</Button>}
                        {user?.role === 'admin' && !transaction.is_canceled && (
                            <Button variant="danger" onClick={() => setShowCancelModal(true)}>Cancel Transaction</Button>
                        )}
                    </>
                }
            />

            {/* Transaction Info */}
            <div className={styles.detailCard}>
                <div className={styles.detailMeta}>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Status</span>
                        <span className={styles.metaValue}>
                            <Badge variant={transaction.is_canceled ? 'danger' : 'success'}>
                                {transaction.is_canceled ? 'Canceled' : 'Completed'}
                            </Badge>
                        </span>
                    </div>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Payment Type</span>
                        <span className={styles.metaValue}>
                            <Badge variant={transaction.payment_type === 'cash' ? 'success' : 'warning'}>
                                {transaction.payment_type}
                            </Badge>
                        </span>
                    </div>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Cashier</span>
                        <span className={styles.metaValue}>
                            {transaction.cashier?.username || 'N/A'}
                        </span>
                    </div>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Token</span>
                        <span className={styles.metaValue}>
                            {receipt?.token || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Line Items */}
                <h4 style={{ marginBottom: 'var(--spacing-3)' }}>Items</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-gray-200)' }}>
                            <th style={{ textAlign: 'left', padding: 'var(--spacing-2)' }}>Item</th>
                            <th style={{ textAlign: 'center', padding: 'var(--spacing-2)' }}>Portion</th>
                            <th style={{ textAlign: 'center', padding: 'var(--spacing-2)' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>Price</th>
                            <th style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.lines?.map((line, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                <td style={{ padding: 'var(--spacing-2)' }}>{line.food_item?.name || `Item #${line.food_item}`}</td>
                                <td style={{ textAlign: 'center', padding: 'var(--spacing-2)' }}>{line.portion_type}</td>
                                <td style={{ textAlign: 'center', padding: 'var(--spacing-2)' }}>{line.quantity}</td>
                                <td style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>{formatCurrency(line.unit_price)}</td>
                                <td style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>{formatCurrency(line.line_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        {transaction.tax > 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>Tax:</td>
                                <td style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>{formatCurrency(transaction.tax)}</td>
                            </tr>
                        )}
                        {transaction.discount > 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>Discount:</td>
                                <td style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>-{formatCurrency(transaction.discount)}</td>
                            </tr>
                        )}
                        <tr style={{ fontWeight: 'bold', fontSize: 'var(--font-size-lg)' }}>
                            <td colSpan="4" style={{ textAlign: 'right', padding: 'var(--spacing-3)' }}>Total:</td>
                            <td style={{ textAlign: 'right', padding: 'var(--spacing-3)' }}>{formatCurrency(transaction.total_amount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {transaction.notes && (
                    <div style={{ marginTop: 'var(--spacing-4)', padding: 'var(--spacing-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                        <strong>Notes:</strong> {transaction.notes}
                    </div>
                )}
            </div>

            {/* Cancel Confirmation Modal */}
            <Modal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                title="Cancel Transaction"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowCancelModal(false)}>No, Keep It</Button>
                        <Button variant="danger" onClick={handleCancel} loading={canceling}>Yes, Cancel Transaction</Button>
                    </>
                }
            >
                <p>Are you sure you want to cancel this transaction?</p>
                <p style={{ color: 'var(--color-danger)', marginTop: 'var(--spacing-3)' }}>
                    This will reverse any account balance changes and create reversal entries in the cashbook.
                </p>
            </Modal>

            {/* Hidden Receipt for Printing */}
            {/* Hidden Receipt for Printing */}
            <div className={receiptStyles.printOnlyWrapper}>
                <ReceiptPrint payload={receipt?.payload} />
            </div>
        </div>
    )
}
