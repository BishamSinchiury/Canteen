import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Dashboard.module.css'
import { PageHeader } from '../components/Layout'
import { StatCard } from '../components/ui/Card'
import { Loader } from '../components/ui/Badge'
import { getDailySummary, getCashOnHand, getOutstandingCredit, fetchTransactions } from '../api'

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [dailyData, setDailyData] = useState(null)
    const [cashData, setCashData] = useState(null)
    const [creditData, setCreditData] = useState(null)
    const [recentTx, setRecentTx] = useState([])

    useEffect(() => {
        loadDashboardData()
    }, [])

    async function loadDashboardData() {
        try {
            const [daily, cash, credit, txResponse] = await Promise.all([
                getDailySummary().catch(() => null),
                getCashOnHand().catch(() => null),
                getOutstandingCredit().catch(() => null),
                fetchTransactions('?page_size=5').catch(() => ({ results: [] }))
            ])

            setDailyData(daily)
            setCashData(cash)
            setCreditData(credit)
            setRecentTx(txResponse.results || txResponse || [])
        } catch (err) {
            console.error('Dashboard load error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <Loader center size="lg" />
    }

    const formatCurrency = (amount) => {
        return `Rs. ${Number(amount || 0).toLocaleString('en-NP', { minimumFractionDigits: 2 })}`
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        <div className={styles.dashboard}>
            <PageHeader
                title="Dashboard"
                subtitle="Welcome to EECOHM Canteen Management System"
            />

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    label="Today's Sales"
                    value={formatCurrency(dailyData?.total_sales)}
                    icon="💰"
                    iconVariant="success"
                />
                <StatCard
                    label="Cash on Hand"
                    value={formatCurrency(cashData?.cash_on_hand)}
                    icon="💵"
                    iconVariant="primary"
                />
                <StatCard
                    label="Outstanding Credit"
                    value={formatCurrency(creditData?.total_outstanding)}
                    icon="📋"
                    iconVariant="warning"
                />
                <StatCard
                    label="Today's Transactions"
                    value={dailyData?.transaction_count || '0'}
                    icon="🧾"
                    iconVariant="primary"
                />
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
                <Link to="/pos" className={styles.actionCard}>
                    <div className={styles.actionIcon}>🛒</div>
                    <div className={styles.actionContent}>
                        <h4>New Sale</h4>
                        <p>Create a new transaction</p>
                    </div>
                </Link>
                <Link to="/accounts/students" className={styles.actionCard}>
                    <div className={styles.actionIcon}>🎓</div>
                    <div className={styles.actionContent}>
                        <h4>Student Accounts</h4>
                        <p>Manage student credits</p>
                    </div>
                </Link>
                <Link to="/reports" className={styles.actionCard}>
                    <div className={styles.actionIcon}>📈</div>
                    <div className={styles.actionContent}>
                        <h4>Reports</h4>
                        <p>View sales reports</p>
                    </div>
                </Link>
            </div>

            {/* Two Column Layout */}
            <div className={styles.twoColumn}>
                {/* Recent Transactions */}
                <div className={styles.recentTransactions}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>Recent Transactions</h3>
                        <Link to="/transactions" className={styles.viewAllLink}>View All →</Link>
                    </div>
                    <div className={styles.transactionsList}>
                        {recentTx.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-4)' }}>
                                No transactions today
                            </p>
                        ) : (
                            recentTx.map(tx => (
                                <div key={tx.id} className={styles.transactionItem}>
                                    <div className={styles.txInfo}>
                                        <div className={`${styles.txIcon} ${tx.payment_type === 'cash' ? styles.txCash : styles.txCredit}`}>
                                            {tx.payment_type === 'cash' ? '💵' : '📋'}
                                        </div>
                                        <div className={styles.txDetails}>
                                            <h5>Transaction #{tx.id}</h5>
                                            <span>
                                                {formatTime(tx.timestamp)} • {tx.payment_type}
                                                {tx.cashier && ` • ${tx.cashier.username || tx.cashier}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.txAmount}>
                                        {formatCurrency(tx.total_amount)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Selling Items */}
                <div className={styles.topItems}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>Top Selling Today</h3>
                    </div>
                    <div className={styles.topItemsList}>
                        {(!dailyData?.top_items || dailyData.top_items.length === 0) ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-4)' }}>
                                No sales data
                            </p>
                        ) : (
                            dailyData.top_items.slice(0, 5).map((item, idx) => (
                                <div key={idx} className={styles.topItem}>
                                    <div className={styles.itemRank}>{idx + 1}</div>
                                    <div className={styles.itemName}>{item.food_item__name}</div>
                                    <div className={styles.itemCount}>{item.quantity_sold} sold</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
