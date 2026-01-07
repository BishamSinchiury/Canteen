import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../../components/ui'
import Input from '../../components/ui/Input'
import { fetchVendors, createVendor, updateVendor } from '../../api'
import styles from '../common.module.css'

export default function Vendors() {
    const [vendors, setVendors] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingVendor, setEditingVendor] = useState(null)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const toast = useToast()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    })

    useEffect(() => {
        loadVendors()
    }, [])

    async function loadVendors() {
        try {
            const data = await fetchVendors()
            setVendors(data.results || data || [])
        } catch (err) {
            toast.error('Failed to load vendors')
        } finally {
            setLoading(false)
        }
    }

    function openAddModal() {
        setEditingVendor(null)
        setForm({
            name: '',
            contact_name: '',
            phone: '',
            email: '',
            address: '',
            notes: ''
        })
        setErrors({})
        setShowModal(true)
    }

    function openEditModal(vendor) {
        setEditingVendor(vendor)
        setForm({
            name: vendor.name,
            contact_name: vendor.contact_name || '',
            phone: vendor.phone || '',
            email: vendor.email || '',
            address: vendor.address || '',
            notes: vendor.notes || ''
        })
        setErrors({})
        setShowModal(true)
    }

    function handleInputChange(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }))
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const newErrors = {}
        if (!form.name.trim()) newErrors.name = 'Name is required'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setSaving(true)
        setErrors({})
        try {
            if (editingVendor) {
                await updateVendor(editingVendor.id, form)
                toast.success('Vendor updated')
            } else {
                await createVendor(form)
                toast.success('Vendor created')
            }
            setShowModal(false)
            loadVendors()
        } catch (err) {
            console.error(err)
            const serverErrors = {}
            let genericMsg = err.message || 'Failed to save vendor'

            if (err.data) {
                if (typeof err.data === 'object' && !err.data.detail) {
                    for (const [key, val] of Object.entries(err.data)) {
                        serverErrors[key] = Array.isArray(val) ? val.join(', ') : val
                    }
                } else if (err.data.detail) {
                    genericMsg = err.data.detail
                }
            }

            if (Object.keys(serverErrors).length > 0) {
                setErrors(serverErrors)
            } else {
                toast.error(genericMsg)
            }
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        { header: 'Vendor Name', accessor: 'name' },
        { header: 'Contact', accessor: 'contact_name' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Balance', accessor: 'balance', render: (row) => `Rs. ${parseFloat(row.balance || 0).toFixed(2)}` },
        {
            header: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>Edit</Button>
                    <Button size="sm" onClick={() => navigate(`/inventory/vendors/${row.id}/ledger`)}>Ledger</Button>
                </div>
            )
        }
    ]

    if (loading) return <Loader center size="lg" />

    return (
        <div>
            <PageHeader
                title="Vendors"
                subtitle="Manage suppliers and contact details"
                actions={<Button onClick={openAddModal}>+ Add Vendor</Button>}
            />

            <Table
                columns={columns}
                data={vendors}
                emptyMessage="No vendors found"
            />

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            {editingVendor ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className={styles.form}>
                    <Input
                        label="Vendor Name"
                        value={form.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        error={errors.name}
                        required
                    />
                    <Input
                        label="Contact Person"
                        value={form.contact_name}
                        onChange={e => handleInputChange('contact_name', e.target.value)}
                        error={errors.contact_name}
                    />
                    <div className={styles.formRow}>
                        <Input
                            label="Phone"
                            value={form.phone}
                            onChange={e => handleInputChange('phone', e.target.value)}
                            error={errors.phone}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={e => handleInputChange('email', e.target.value)}
                            error={errors.email}
                        />
                    </div>
                    <Input
                        label="Address"
                        value={form.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                        error={errors.address}
                    />
                    <Input
                        label="Notes"
                        value={form.notes}
                        onChange={e => handleInputChange('notes', e.target.value)}
                        error={errors.notes}
                    />
                </form>
            </Modal>
        </div>
    )
}
