import React, { useState, useEffect } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { StatCard } from '../components/ui/Card'
import { fetchCashbook, getCashbookSummary, createCashbookEntry } from '../api'
import styles from './common.module.css'

export default function Cashbook() {
    const [entries, setEntries] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)

    const toast = useToast()

    const [form, setForm] = useState({
        entry_type: 'income',
        amount: '',
        description: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [entriesData, summaryData] = await Promise.all([
                fetchCashbook(),
                getCashbookSummary()
            ])
            setEntries(entriesData.results || entriesData || [])
            setSummary(summaryData)
        } catch (err) {
            toast.error('Failed to load cashbook')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.warning('Enter a valid amount')
            return
        }

        setSaving(true)
        try {
            await createCashbookEntry(form)
            toast.success('Entry added successfully')
            setShowModal(false)
            setForm({ entry_type: 'income', amount: '', description: '' })
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to add entry')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        {
            header: 'Date',
            render: (row) => new Date(row.date).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            })
        },
        {
            header: 'Type',
            render: (row) => (
                <Badge variant={row.entry_type === 'income' ? 'success' : 'danger'}>
                    {row.entry_type}
                </Badge>
            )
        },
        {
            header: 'Amount',
            render: (row) => (
                <span style={{ color: row.entry_type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {row.entry_type === 'income' ? '+' : '-'} Rs. {parseFloat(row.amount).toFixed(2)}
                </span>
            )
        },
        {
            header: 'Description',
            accessor: 'description'
        },
        {
            header: 'Transaction',
            render: (row) => row.related_transaction ? `#${row.related_transaction}` : '-'
        },
        {
            header: 'Created By',
            render: (row) => row.created_by_name || '-'
        }
    ]

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Cashbook"
                subtitle="Track cash income and expenses"
                actions={<Button onClick={() => setShowModal(true)}>+ Add Entry</Button>}
            />

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-5)' }}>
                <StatCard
                    label="Total Income"
                    value={`Rs. ${summary?.total_income?.toFixed(2) || '0.00'}`}
                    icon="📥"
                    iconVariant="success"
                />
                <StatCard
                    label="Total Expense"
                    value={`Rs. ${summary?.total_expense?.toFixed(2) || '0.00'}`}
                    icon="📤"
                    iconVariant="danger"
                />
                <StatCard
                    label="Balance"
                    value={`Rs. ${summary?.balance?.toFixed(2) || '0.00'}`}
                    icon="💰"
                    iconVariant={summary?.balance >= 0 ? 'success' : 'danger'}
                />
            </div>

            <Table
                columns={columns}
                data={entries}
                emptyMessage="No cashbook entries found"
            />

            {/* Add Entry Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add Cashbook Entry"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>Add Entry</Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <Select
                        label="Entry Type"
                        value={form.entry_type}
                        onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
                    >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </Select>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Amount (Rs.)"
                            type="number"
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Entry description"
                            textarea
                        />
                    </div>
                </form>
            </Modal>
        </div>
    )
}
