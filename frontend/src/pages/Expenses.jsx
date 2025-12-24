import React, { useState, useEffect } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { StatCard } from '../components/ui/Card'
import { fetchExpenses, createExpense, getExpenseSummary, getExpenseCategories } from '../api'
import styles from './common.module.css'

export default function Expenses() {
    const [expenses, setExpenses] = useState([])
    const [summary, setSummary] = useState(null)
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)

    const toast = useToast()

    const [form, setForm] = useState({
        description: '',
        amount: '',
        category: '',
        paid_by: 'cash'
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [expData, summaryData, catData] = await Promise.all([
                fetchExpenses(),
                getExpenseSummary().catch(() => null),
                getExpenseCategories().catch(() => [])
            ])
            setExpenses(expData.results || expData || [])
            setSummary(summaryData)
            setCategories(catData || [])
        } catch (err) {
            toast.error('Failed to load expenses')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!form.description || !form.amount || parseFloat(form.amount) <= 0) {
            toast.warning('Description and valid amount are required')
            return
        }

        setSaving(true)
        try {
            await createExpense(form)
            toast.success('Expense added successfully')
            setShowModal(false)
            setForm({ description: '', amount: '', category: '', paid_by: 'cash' })
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to add expense')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        {
            header: 'Date',
            render: (row) => new Date(row.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            })
        },
        {
            header: 'Description',
            accessor: 'description'
        },
        {
            header: 'Category',
            render: (row) => row.category || '-'
        },
        {
            header: 'Amount',
            render: (row) => `Rs. ${parseFloat(row.amount).toFixed(2)}`
        },
        {
            header: 'Paid By',
            render: (row) => (
                <Badge variant={row.paid_by === 'cash' ? 'success' : 'warning'}>
                    {row.paid_by}
                </Badge>
            )
        }
    ]

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Expenses"
                subtitle="Track canteen expenses"
                actions={<Button onClick={() => setShowModal(true)}>+ Add Expense</Button>}
            />

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-5)' }}>
                <StatCard
                    label="Total Expenses"
                    value={`Rs. ${summary?.total?.toFixed(2) || '0.00'}`}
                    icon="📤"
                    iconVariant="danger"
                />
                {summary?.by_category?.slice(0, 3).map((cat, idx) => (
                    <StatCard
                        key={idx}
                        label={cat.category || 'Uncategorized'}
                        value={`Rs. ${parseFloat(cat.total).toFixed(2)}`}
                        icon="📊"
                        iconVariant="primary"
                    />
                ))}
            </div>

            <Table
                columns={columns}
                data={expenses}
                emptyMessage="No expenses recorded"
            />

            {/* Add Expense Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add Expense"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>Add Expense</Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="What was the expense for?"
                        required
                    />

                    <div className={styles.formRow} style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Amount (Rs.)"
                            type="number"
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                        <Input
                            label="Category"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            placeholder="e.g., Supplies"
                            list="categories"
                        />
                        <datalist id="categories">
                            {categories.map((cat, idx) => (
                                <option key={idx} value={cat} />
                            ))}
                        </datalist>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Select
                            label="Paid By"
                            value={form.paid_by}
                            onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                        >
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                            <option value="bank">Bank Transfer</option>
                        </Select>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
