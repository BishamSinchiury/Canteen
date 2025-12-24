import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { Button, Loader, useToast, Modal, Badge } from '../components/ui'
import Input from '../components/ui/Input'
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '../api'
import { AuthContext } from '../context/AuthContext'
import styles from './common.module.css'

export default function StudentAccounts() {
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingAccount, setEditingAccount] = useState(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const navigate = useNavigate()
    const { user } = useContext(AuthContext)
    const toast = useToast()
    const canEdit = user?.role === 'admin' || user?.role === 'manager'

    const [form, setForm] = useState({
        account_id: '',
        name: '',
        class_or_department: '',
        roll_no: '',
        contact_info: ''
    })

    useEffect(() => {
        loadAccounts()
    }, [])

    async function loadAccounts() {
        try {
            const data = await fetchAccounts('?account_type=student')
            setAccounts(data.results || data || [])
        } catch (err) {
            toast.error('Failed to load accounts')
        } finally {
            setLoading(false)
        }
    }

    function openAddModal() {
        setEditingAccount(null)
        setForm({
            account_id: '',
            name: '',
            class_or_department: '',
            roll_no: '',
            contact_info: ''
        })
        setShowModal(true)
    }

    function openEditModal(account) {
        setEditingAccount(account)
        setForm({
            account_id: account.account_id,
            name: account.name,
            class_or_department: account.class_or_department || '',
            roll_no: account.roll_no || '',
            contact_info: account.contact_info || ''
        })
        setShowModal(true)
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!form.account_id || !form.name) {
            toast.warning('Account ID and Name are required')
            return
        }

        setSaving(true)
        try {
            const payload = {
                ...form,
                account_type: 'student'
            }

            if (editingAccount) {
                await updateAccount(editingAccount.id, payload)
                toast.success('Account updated successfully')
            } else {
                await createAccount(payload)
                toast.success('Account created successfully')
            }

            setShowModal(false)
            loadAccounts()
        } catch (err) {
            toast.error(err.message || 'Failed to save account')
        } finally {
            setSaving(false)
        }
    }

    const filteredAccounts = accounts.filter(acc =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.account_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.class_or_department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Student Accounts"
                subtitle={`${accounts.length} student accounts`}
                actions={canEdit && <Button onClick={openAddModal}>+ Add Student</Button>}
            />

            <div className={styles.filterPanel} style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div style={{ flex: 1 }}>
                    <Input
                        placeholder="Search by name, ID, or class..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<span>🔍</span>}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-4)' }}>
                {filteredAccounts.map(account => (
                    <div
                        key={account.id}
                        className={styles.accountCard}
                        onClick={() => navigate(`/accounts/${account.account_id}`)}
                    >
                        <div className={styles.accountAvatar}>
                            {getInitials(account.name)}
                        </div>
                        <div className={styles.accountInfo}>
                            <h4 className={styles.accountName}>{account.name}</h4>
                            <div className={styles.accountId}>
                                {account.account_id} • {account.class_or_department || 'N/A'}
                            </div>
                        </div>
                        <div className={styles.accountBalance}>
                            <div className={styles.balanceLabel}>Balance</div>
                            <div className={`${styles.balanceValue} ${parseFloat(account.balance) > 0 ? styles.balancePositive : styles.balanceZero}`}>
                                Rs. {parseFloat(account.balance).toFixed(2)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAccounts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>🎓</div>
                    <p>No student accounts found</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingAccount ? 'Edit Student Account' : 'Add Student Account'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            {editingAccount ? 'Update Account' : 'Create Account'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <Input
                            label="Student ID"
                            value={form.account_id}
                            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                            required
                            placeholder="e.g., S001"
                            disabled={!!editingAccount}
                        />
                        <Input
                            label="Roll No"
                            value={form.roll_no}
                            onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                            placeholder="e.g., 01"
                        />
                    </div>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Full Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            placeholder="Student's full name"
                        />
                    </div>

                    <div className={styles.formRow} style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Class"
                            value={form.class_or_department}
                            onChange={(e) => setForm({ ...form, class_or_department: e.target.value })}
                            placeholder="e.g., Class 10"
                        />
                        <Input
                            label="Contact"
                            value={form.contact_info}
                            onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                            placeholder="Phone number"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    )
}
