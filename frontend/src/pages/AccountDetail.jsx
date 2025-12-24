import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { Button, Loader, useToast, Modal, Badge, Table } from '../components/ui'
import Input from '../components/ui/Input'
import Card, { CardBody, StatCard } from '../components/ui/Card'
import { fetchAccounts, paymentAccount, chargeAccount, getAccountStatement, exportAccountStatement } from '../api'
import { AuthContext } from '../context/AuthContext'
import styles from './common.module.css'

export default function AccountDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useContext(AuthContext)
    const toast = useToast()

    const [account, setAccount] = useState(null)
    const [statement, setStatement] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showChargeModal, setShowChargeModal] = useState(false)
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [processing, setProcessing] = useState(false)

    const canEdit = user?.role === 'admin' || user?.role === 'manager'

    useEffect(() => {
        loadAccount()
    }, [id])

    async function loadAccount() {
        try {
            const accounts = await fetchAccounts(`?account_id=${id}`)
            const acc = (accounts.results || accounts || []).find(a => a.account_id === id)
            if (!acc) {
                toast.error('Account not found')
                navigate(-1)
                return
            }
            setAccount(acc)

            // Load statement
            const stmt = await getAccountStatement(acc.id).catch(() => null)
            setStatement(stmt)
        } catch (err) {
            toast.error('Failed to load account')
        } finally {
            setLoading(false)
        }
    }

    async function handlePayment() {
        if (!amount || parseFloat(amount) <= 0) {
            toast.warning('Enter a valid amount')
            return
        }

        setProcessing(true)
        try {
            await paymentAccount(account.id, amount, description)
            toast.success(`Payment of Rs. ${amount} recorded successfully`)
            setShowPaymentModal(false)
            setAmount('')
            setDescription('')
            loadAccount()
        } catch (err) {
            toast.error(err.message || 'Failed to record payment')
        } finally {
            setProcessing(false)
        }
    }

    async function handleCharge() {
        if (!amount || parseFloat(amount) <= 0) {
            toast.warning('Enter a valid amount')
            return
        }

        setProcessing(true)
        try {
            await chargeAccount(account.id, amount, description)
            toast.success(`Charge of Rs. ${amount} added successfully`)
            setShowChargeModal(false)
            setAmount('')
            setDescription('')
            loadAccount()
        } catch (err) {
            toast.error(err.message || 'Failed to add charge')
        } finally {
            setProcessing(false)
        }
    }

    async function handleExport() {
        try {
            const blob = await exportAccountStatement(id)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `statement_${id}.csv`
            a.click()
            toast.success('Statement exported')
        } catch (err) {
            toast.error('Export failed')
        }
    }

    if (loading) {
        return <Loader center size="lg" />
    }

    if (!account) {
        return <div>Account not found</div>
    }

    const isStudent = account.account_type === 'student'

    return (
        <div>
            <PageHeader
                title={account.name}
                subtitle={`${isStudent ? 'Student' : 'Teacher'} Account • ${account.account_id}`}
                actions={
                    <>
                        <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
                        <Button variant="secondary" onClick={handleExport}>📤 Export</Button>
                        {canEdit && (
                            <>
                                <Button variant="success" onClick={() => setShowPaymentModal(true)}>Record Payment</Button>
                                <Button variant="warning" onClick={() => setShowChargeModal(true)}>Add Charge</Button>
                            </>
                        )}
                    </>
                }
            />

            {/* Account Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-5)' }}>
                <StatCard
                    label="Current Balance"
                    value={`Rs. ${parseFloat(account.balance).toFixed(2)}`}
                    icon={parseFloat(account.balance) > 0 ? '📋' : '✓'}
                    iconVariant={parseFloat(account.balance) > 0 ? 'warning' : 'success'}
                />
                <StatCard
                    label="Account ID"
                    value={account.account_id}
                    icon={isStudent ? '🎓' : '👨‍🏫'}
                    iconVariant="primary"
                />
                <StatCard
                    label={isStudent ? 'Class' : 'Department'}
                    value={account.class_or_department || 'N/A'}
                    icon="🏫"
                    iconVariant="primary"
                />
                <StatCard
                    label="Contact"
                    value={account.contact_info || 'N/A'}
                    icon="📞"
                    iconVariant="primary"
                />
            </div>

            {/* Transaction History */}
            <div className={styles.detailCard}>
                <h3 style={{ marginBottom: 'var(--spacing-4)' }}>Transaction History</h3>

                {statement?.transactions?.length > 0 ? (
                    <Table
                        columns={[
                            {
                                header: 'Date',
                                render: (row) => new Date(row.timestamp).toLocaleDateString()
                            },
                            {
                                header: 'Transaction',
                                render: (row) => `#${row.id}`
                            },
                            {
                                header: 'Amount',
                                render: (row) => `Rs. ${parseFloat(row.total_amount).toFixed(2)}`
                            },
                            {
                                header: 'Type',
                                render: (row) => (
                                    <Badge variant={row.payment_type === 'credit' ? 'warning' : 'default'}>
                                        {row.payment_type}
                                    </Badge>
                                )
                            }
                        ]}
                        data={statement.transactions}
                        onRowClick={(row) => navigate(`/transactions/${row.id}`)}
                    />
                ) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-4)' }}>
                        No transactions found for this account
                    </p>
                )}
            </div>

            {/* Payment History */}
            {statement?.payments?.length > 0 && (
                <div className={styles.detailCard}>
                    <h3 style={{ marginBottom: 'var(--spacing-4)' }}>Payment History</h3>
                    <Table
                        columns={[
                            {
                                header: 'Date',
                                render: (row) => new Date(row.date).toLocaleDateString()
                            },
                            {
                                header: 'Description',
                                accessor: 'description'
                            },
                            {
                                header: 'Amount',
                                render: (row) => `Rs. ${row.amount}`
                            }
                        ]}
                        data={statement.payments}
                    />
                </div>
            )}

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Payment"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                        <Button variant="success" onClick={handlePayment} loading={processing}>Record Payment</Button>
                    </>
                }
            >
                <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--text-secondary)' }}>
                    Recording a payment will decrease the account balance.
                </p>
                <Input
                    label="Amount (Rs.)"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                />
                <div style={{ marginTop: 'var(--spacing-4)' }}>
                    <Input
                        label="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Payment notes..."
                    />
                </div>
            </Modal>

            {/* Charge Modal */}
            <Modal
                isOpen={showChargeModal}
                onClose={() => setShowChargeModal(false)}
                title="Add Charge"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowChargeModal(false)}>Cancel</Button>
                        <Button variant="warning" onClick={handleCharge} loading={processing}>Add Charge</Button>
                    </>
                }
            >
                <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--text-secondary)' }}>
                    Adding a charge will increase the account balance (amount owed).
                </p>
                <Input
                    label="Amount (Rs.)"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                />
                <div style={{ marginTop: 'var(--spacing-4)' }}>
                    <Input
                        label="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Charge notes..."
                    />
                </div>
            </Modal>
        </div>
    )
}
