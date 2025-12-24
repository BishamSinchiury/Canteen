import React, { useState, useEffect } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { fetchUsers, createUser, updateUser, deleteUser } from '../api'
import styles from './common.module.css'

export default function Users() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [saving, setSaving] = useState(false)

    const toast = useToast()

    const [form, setForm] = useState({
        username: '',
        email: '',
        full_name: '',
        role: 'cashier',
        password: '',
        is_active: true
    })

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        try {
            const data = await fetchUsers()
            setUsers(data.results || data || [])
        } catch (err) {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    function openAddModal() {
        setEditingUser(null)
        setForm({
            username: '',
            email: '',
            full_name: '',
            role: 'cashier',
            password: '',
            is_active: true
        })
        setShowModal(true)
    }

    function openEditModal(user) {
        setEditingUser(user)
        setForm({
            username: user.username,
            email: user.email || '',
            full_name: user.full_name || '',
            role: user.role,
            password: '',
            is_active: user.is_active
        })
        setShowModal(true)
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!form.username) {
            toast.warning('Username is required')
            return
        }

        if (!editingUser && !form.password) {
            toast.warning('Password is required for new users')
            return
        }

        setSaving(true)
        try {
            const payload = { ...form }
            if (!payload.password) {
                delete payload.password
            }

            if (editingUser) {
                await updateUser(editingUser.id, payload)
                toast.success('User updated successfully')
            } else {
                await createUser(payload)
                toast.success('User created successfully')
            }

            setShowModal(false)
            loadUsers()
        } catch (err) {
            toast.error(err.message || 'Failed to save user')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeactivate(user) {
        if (!confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.username}?`)) {
            return
        }

        try {
            await updateUser(user.id, { is_active: !user.is_active })
            toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
            loadUsers()
        } catch (err) {
            toast.error('Failed to update user status')
        }
    }

    const roleColors = {
        admin: 'danger',
        manager: 'warning',
        cashier: 'info'
    }

    const columns = [
        {
            header: 'Username',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{row.username}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {row.email || 'No email'}
                    </div>
                </div>
            )
        },
        {
            header: 'Full Name',
            accessor: 'full_name',
            render: (row) => row.full_name || '-'
        },
        {
            header: 'Role',
            render: (row) => (
                <Badge variant={roleColors[row.role] || 'default'}>
                    {row.role}
                </Badge>
            )
        },
        {
            header: 'Status',
            render: (row) => (
                <Badge variant={row.is_active ? 'success' : 'danger'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>Edit</Button>
                    <Button
                        size="sm"
                        variant={row.is_active ? 'warning' : 'success'}
                        onClick={() => handleDeactivate(row)}
                    >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                </div>
            )
        }
    ]

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="User Management"
                subtitle="Manage system users and roles"
                actions={<Button onClick={openAddModal}>+ Add User</Button>}
            />

            <Table
                columns={columns}
                data={users}
                emptyMessage="No users found"
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingUser ? 'Edit User' : 'Add User'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            {editingUser ? 'Update User' : 'Create User'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <Input
                            label="Username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                            placeholder="Enter username"
                            disabled={!!editingUser}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="user@example.com"
                        />
                    </div>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Full Name"
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            placeholder="User's full name"
                        />
                    </div>

                    <div className={styles.formRow} style={{ marginTop: 'var(--spacing-4)' }}>
                        <Select
                            label="Role"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                            <option value="cashier">Cashier</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </Select>
                        <Input
                            label={editingUser ? 'New Password (leave blank to keep)' : 'Password'}
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Enter password"
                            required={!editingUser}
                        />
                    </div>

                    {editingUser && (
                        <div style={{ marginTop: 'var(--spacing-4)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                />
                                Active User
                            </label>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    )
}
