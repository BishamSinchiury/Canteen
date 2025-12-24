import React, { useState, useEffect } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Loader, useToast, Badge } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { StatCard } from '../components/ui/Card'
import {
    getDailySummary, getMonthlySummary, getCustomReport, exportTransactions, fetchFoodItems,
    exportDailySummaryExcel, exportMonthlySummaryExcel
} from '../api'
import styles from './common.module.css'

export default function Reports() {
    const [reportType, setReportType] = useState('daily')
    const [reportData, setReportData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [foodItems, setFoodItems] = useState([])

    const toast = useToast()

    // Filters
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [foodItem, setFoodItem] = useState('')

    useEffect(() => {
        loadFoodItems()
        generateReport()
    }, [])

    async function loadFoodItems() {
        try {
            const data = await fetchFoodItems()
            setFoodItems(data.results || data || [])
        } catch (err) {
            console.error('Failed to load food items')
        }
    }

    async function generateReport() {
        setLoading(true)
        try {
            let data
            if (reportType === 'daily') {
                data = await getDailySummary(date)
            } else if (reportType === 'monthly') {
                data = await getMonthlySummary(year, month)
            } else {
                if (!dateFrom || !dateTo) {
                    toast.warning('Please select date range')
                    setLoading(false)
                    return
                }
                data = await getCustomReport({
                    date_from: dateFrom,
                    date_to: dateTo,
                    food_item: foodItem || undefined
                })
            }
            setReportData(data)
        } catch (err) {
            toast.error('Failed to generate report')
        } finally {
            setLoading(false)
        }
    }

    async function handleExportExcel() {
        setExporting(true)
        try {
            let blob
            let filename

            if (reportType === 'daily') {
                blob = await exportDailySummaryExcel(date)
                filename = `daily_summary_${date}.xlsx`
            } else if (reportType === 'monthly') {
                blob = await exportMonthlySummaryExcel(year, month)
                filename = `monthly_summary_${year}_${String(month).padStart(2, '0')}.xlsx`
            } else {
                toast.warning('Excel export not available for custom reports yet')
                setExporting(false)
                return
            }

            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()
            window.URL.revokeObjectURL(url)
            toast.success('Report exported to Excel')
        } catch (err) {
            toast.error('Export failed')
        } finally {
            setExporting(false)
        }
    }

    const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`

    return (
        <div>
            <PageHeader
                title="Reports"
                subtitle="Generate and export sales reports"
                actions={reportData && (
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <Button variant="secondary" onClick={handleExportExcel} loading={exporting}>
                            📊 Export Excel
                        </Button>
                    </div>
                )}
            />

            {/* Report Type Selection */}
            <div className={styles.filterPanel}>
                <Select
                    label="Report Type"
                    value={reportType}
                    onChange={(e) => { setReportType(e.target.value); setReportData(null); }}
                >
                    <option value="daily">Daily Report</option>
                    <option value="monthly">Monthly Report</option>
                    <option value="custom">Custom Range</option>
                </Select>

                {reportType === 'daily' && (
                    <Input
                        type="date"
                        label="Date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                )}

                {reportType === 'monthly' && (
                    <>
                        <Input
                            type="number"
                            label="Year"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            min={2020}
                            max={2100}
                        />
                        <Select
                            label="Month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        >
                            {['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                                    <option key={idx} value={idx + 1}>{m}</option>
                                ))}
                        </Select>
                    </>
                )}

                {reportType === 'custom' && (
                    <>
                        <Input
                            type="date"
                            label="From Date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <Input
                            type="date"
                            label="To Date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                        <Select
                            label="Food Item (Optional)"
                            value={foodItem}
                            onChange={(e) => setFoodItem(e.target.value)}
                        >
                            <option value="">All Items</option>
                            {foodItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </Select>
                    </>
                )}

                <div className={styles.filterActions}>
                    <Button onClick={generateReport} loading={loading}>Generate Report</Button>
                </div>
            </div>

            {/* Report Results */}
            {loading && <Loader center size="lg" />}

            {!loading && reportData && (
                <>
                    {/* Summary Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-5)' }}>
                        <StatCard
                            label="Total Sales"
                            value={formatCurrency(reportData.total_sales)}
                            icon="💰"
                            iconVariant="success"
                        />
                        <StatCard
                            label="Transactions"
                            value={reportData.transaction_count || 0}
                            icon="🧾"
                            iconVariant="primary"
                        />
                        <StatCard
                            label="Cash Sales"
                            value={formatCurrency(reportData.cash_sales)}
                            icon="💵"
                            iconVariant="success"
                        />
                        <StatCard
                            label="Credit Sales"
                            value={formatCurrency(reportData.credit_sales)}
                            icon="📋"
                            iconVariant="warning"
                        />
                    </div>

                    {/* Top Selling Items */}
                    {reportData.top_items?.length > 0 && (
                        <div className={styles.reportSection}>
                            <div className={styles.reportHeader}>
                                <h3 className={styles.reportTitle}>Top Selling Items</h3>
                            </div>
                            <div className={styles.statsList}>
                                {reportData.top_items.map((item, idx) => (
                                    <div key={idx} className={styles.statItem}>
                                        <div className={styles.statLabel}>#{idx + 1} {item.food_item__name}</div>
                                        <div className={styles.statValue}>{item.quantity_sold || item.q} sold</div>
                                        {item.revenue && (
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                {formatCurrency(item.revenue)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Daily Breakdown (Monthly Report) */}
                    {reportData.daily_breakdown?.length > 0 && (
                        <div className={styles.reportSection}>
                            <div className={styles.reportHeader}>
                                <h3 className={styles.reportTitle}>Daily Breakdown</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-gray-200)' }}>
                                            <th style={{ textAlign: 'left', padding: 'var(--spacing-2)' }}>Date</th>
                                            <th style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>Transactions</th>
                                            <th style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.daily_breakdown.map((day, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                                <td style={{ padding: 'var(--spacing-2)' }}>{day.date}</td>
                                                <td style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>{day.count}</td>
                                                <td style={{ textAlign: 'right', padding: 'var(--spacing-2)' }}>{formatCurrency(day.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    {reportType === 'daily' && (
                        <div className={styles.reportSection}>
                            <div className={styles.reportHeader}>
                                <h3 className={styles.reportTitle}>Daily Summary</h3>
                            </div>
                            <div className={styles.statsList}>
                                <div className={styles.statItem}>
                                    <div className={styles.statLabel}>Expenses</div>
                                    <div className={styles.statValue}>{formatCurrency(reportData.expenses)}</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statLabel}>Net Cash</div>
                                    <div className={styles.statValue}>{formatCurrency(reportData.net_cash)}</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statLabel}>Cashbook Income</div>
                                    <div className={styles.statValue}>{formatCurrency(reportData.cashbook_income)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && !reportData && (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>📊</div>
                    <p>Select report parameters and click Generate Report</p>
                </div>
            )}
        </div>
    )
}
