import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { fetchTransactions, fetchFoodItems, exportTransactions, exportTransactionsExcel } from '../api'
import styles from './common.module.css'

export default function Transactions() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
        payment_type: '',
        food_item: ''
    })
    const [foodItems, setFoodItems] = useState([])
    const navigate = useNavigate()
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [txData, menuData] = await Promise.all([
                fetchTransactions(),
                fetchFoodItems()
            ])
            setTransactions(txData.results || txData || [])
            setFoodItems(menuData.results || menuData || [])
        } catch (err) {
            toast.error('Failed to load transactions')
        } finally {
            setLoading(false)
        }
    }

    async function applyFilters() {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.date_from) params.append('date_from', filters.date_from)
            if (filters.date_to) params.append('date_to', filters.date_to)
            if (filters.payment_type) params.append('payment_type', filters.payment_type)
            if (filters.food_item) params.append('food_item', filters.food_item)

            const data = await fetchTransactions(`?${params.toString()}`)
            setTransactions(data.results || data || [])
        } catch (err) {
            toast.error('Failed to filter transactions')
        } finally {
            setLoading(false)
        }
    }

    function clearFilters() {
        setFilters({ date_from: '', date_to: '', payment_type: '', food_item: '' })
        loadData()
    }

    async function handleExportExcel() {
        setExporting(true)
        try {
            const filterParams = {}
            if (filters.date_from) filterParams.date_from = filters.date_from
            if (filters.date_to) filterParams.date_to = filters.date_to
            if (filters.payment_type) filterParams.payment_type = filters.payment_type

            const blob = await exportTransactionsExcel(filterParams)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `transactions_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)
            toast.success('Transactions exported to Excel')
        } catch (err) {
            toast.error('Export failed')
        } finally {
            setExporting(false)
        }
    }

    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            render: (row) => `#${row.id}`
        },
        {
            header: 'Date & Time',
            accessor: 'timestamp',
            render: (row) => new Date(row.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            })
        },
        {
            header: 'Items',
            render: (row) => row.lines?.length || 0
        },
        {
            header: 'Payment',
            accessor: 'payment_type',
            render: (row) => (
                <Badge variant={row.payment_type === 'cash' ? 'success' : row.payment_type === 'credit' ? 'warning' : 'info'}>
                    {row.payment_type}
                </Badge>
            )
        },
        {
            header: 'Amount',
            accessor: 'total_amount',
            render: (row) => `Rs. ${parseFloat(row.total_amount).toFixed(2)}`
        },
        {
            header: 'Status',
            render: (row) => (
                <Badge variant={row.is_canceled ? 'danger' : 'success'}>
                    {row.is_canceled ? 'Canceled' : 'Active'}
                </Badge>
            )
        }
    ]

    if (loading && transactions.length === 0) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Transactions"
                subtitle="View and manage all sales transactions"
                actions={
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <Button variant="secondary" onClick={handleExportExcel} loading={exporting}>
                            📊 Export Excel
                        </Button>
                        <Link to="/pos"><Button>+ New Sale</Button></Link>
                    </div>
                }
            />

            {/* Filters */}
            <div className={styles.filterPanel}>
                <Input
                    type="date"
                    label="From Date"
                    value={filters.date_from}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
                <Input
                    type="date"
                    label="To Date"
                    value={filters.date_to}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
                <Select
                    label="Payment Type"
                    value={filters.payment_type}
                    onChange={(e) => setFilters({ ...filters, payment_type: e.target.value })}
                >
                    <option value="">All Types</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="mixed">Mixed</option>
                </Select>
                <Select
                    label="Food Item"
                    value={filters.food_item}
                    onChange={(e) => setFilters({ ...filters, food_item: e.target.value })}
                >
                    <option value="">All Items</option>
                    {foodItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </Select>
                <div className={styles.filterActions}>
                    <Button onClick={applyFilters}>Apply Filters</Button>
                    <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                </div>
            </div>

            <Table
                columns={columns}
                data={transactions}
                onRowClick={(row) => navigate(`/transactions/${row.id}`)}
                emptyMessage="No transactions found"
            />
        </div>
    )
}
