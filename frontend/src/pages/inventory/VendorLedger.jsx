import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../../components/ui'
import Input from '../../components/ui/Input'
import { fetchVendorTransactions, apiFetch, fetchVendors } from '../../api' // We might need to fetch vendor details
import styles from '../common.module.css'

export default function VendorLedger() {
    const { id } = useParams()
    const [transactions, setTransactions] = useState([])
    const [vendor, setVendor] = useState(null)
    const [loading, setLoading] = useState(true)

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({ amount: '', reference: '', notes: '' })
    const [saving, setSaving] = useState(false)
    const toast = useToast()
    const navigate = useNavigate()

    // Detail Modal State
    const [selectedTx, setSelectedTx] = useState(null)
    const [txDetails, setTxDetails] = useState(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        loadData()
    }, [id])

    async function valueDetails(tx) {
        setSelectedTx(tx)
        setTxDetails(null)
        setLoadingDetails(true)
        setShowDetailModal(true)

        // If it's a PO based on reference "PO #123", try to fetch it
        // The reference format comes from backend services.py: f'PO #{po.id}'
        if (tx.transaction_type === 'CREDIT' && tx.reference.startsWith('PO #')) {
            const poId = tx.reference.split('#')[1]
            try {
                // We reuse fetchPurchaseOrders but we ideally need fetchPurchaseOrder(id)
                // Let's assume we can fetch by ID or filter.
                // Looking at api.js, we have fetchPurchaseOrders(params).
                // But backend typically supports /api/inventory/purchase-orders/ID/
                const res = await apiFetch(`/api/inventory/purchase-orders/${poId}/`)
                setTxDetails(res)
            } catch (err) {
                console.error("Failed to fetch PO details", err)
            }
        }
        setLoadingDetails(false)
    }

    async function loadData() {
        try {
            const vendorData = await apiFetch(`/api/inventory/vendors/${id}/`)
            setVendor(vendorData)

            const txData = await fetchVendorTransactions(id)
            setTransactions(txData.results || txData || [])
        } catch (err) {
            toast.error('Failed to load vendor ledger')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handleRecordPayment(e) {
        e.preventDefault()
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            return toast.warning('Valid amount is required')
        }

        setSaving(true)
        try {
            await apiFetch(`/api/inventory/vendor-transactions/record_payment/`, {
                method: 'POST',
                body: JSON.stringify({
                    vendor_id: id,
                    amount: paymentForm.amount,
                    reference: paymentForm.reference,
                    notes: paymentForm.notes
                })
            })
            toast.success('Payment recorded successfully')
            setShowPaymentModal(false)
            setPaymentForm({ amount: '', reference: '', notes: '' })
            loadData()
        } catch (err) {
            toast.error(err.message || 'Payment recording failed')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        {
            header: 'Date',
            accessor: 'date',
            render: (row) => new Date(row.date).toLocaleString()
        },
        {
            header: 'Type',
            accessor: 'transaction_type',
            render: (row) => (
                <Badge variant={row.transaction_type === 'CREDIT' ? 'warning' : 'success'}>
                    {row.transaction_type}
                </Badge>
            )
        },
        {
            header: 'Reference',
            accessor: 'reference'
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => `Rs. ${parseFloat(row.amount).toFixed(2)}`
        },
        {
            header: 'Balance',
            accessor: 'balance_after',
            render: (row) => `Rs. ${parseFloat(row.balance_after).toFixed(2)}`
        },
        {
            header: 'Actions',
            render: (row) => (
                <Button size="sm" variant="secondary" onClick={() => valueDetails(row)}>View</Button>
            )
        }
    ]

    if (loading) return <Loader center size="lg" />
    if (!vendor) return <div>Vendor not found</div>

    return (
        <div>
            <PageHeader
                title={`Ledger: ${vendor.name}`}
                subtitle={`Current Balance: Rs. ${vendor.balance}`}
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={() => navigate('/inventory/vendors')}>Back</Button>
                        <Button onClick={() => setShowPaymentModal(true)}>Record Payment</Button>
                    </div>
                }
            />

            <Table
                columns={columns}
                data={transactions}
                emptyMessage="No transactions found"
            />

            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Vendor Payment"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                        <Button onClick={handleRecordPayment} loading={saving}>Record Payment</Button>
                    </>
                }
            >
                <form onSubmit={handleRecordPayment} className={styles.form}>
                    <Input
                        label="Amount (Rs)"
                        type="number"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                    />
                    <Input
                        label="Reference (Check # / Ref ID)"
                        value={paymentForm.reference}
                        onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    />
                    <Input
                        label="Notes"
                        value={paymentForm.notes}
                        onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    />
                </form>
            </Modal>

            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Transaction Details"
                footer={<Button onClick={() => setShowDetailModal(false)}>Close</Button>}
                width="600px"
            >
                {selectedTx && (
                    <div className={styles.form}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                            <div><strong>Date:</strong> {new Date(selectedTx.date).toLocaleString()}</div>
                            <div><strong>Type:</strong> {selectedTx.transaction_type}</div>
                            <div><strong>Amount:</strong> Rs. {selectedTx.amount}</div>
                            <div><strong>Reference:</strong> {selectedTx.reference}</div>
                            <div style={{ gridColumn: 'span 2' }}><strong>Notes:</strong> {selectedTx.notes}</div>
                        </div>

                        {loadingDetails ? (
                            <Loader size="sm" />
                        ) : txDetails ? (
                            <div>
                                <h4>Items (PO #{txDetails.id})</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Ingredient</th>
                                            <th style={{ padding: '8px' }}>Qty</th>
                                            <th style={{ padding: '8px' }}>Price/Unit</th>
                                            <th style={{ padding: '8px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txDetails.items?.map((item, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                <td style={{ padding: '8px' }}>{item.ingredient_name}</td>
                                                <td style={{ padding: '8px' }}>{parseFloat(item.quantity).toFixed(2)} {item.unit}</td>
                                                <td style={{ padding: '8px' }}>{parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td style={{ padding: '8px' }}>{(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No additional details available.</p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
