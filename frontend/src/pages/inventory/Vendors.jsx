import React, { useState, useEffect } from 'react'
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
    const toast = useToast()

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
        setShowModal(true)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.name) return toast.warning('Name is required')

        setSaving(true)
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
            toast.error(err.message || 'Failed to save vendor')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        { header: 'Vendor Name', accessor: 'name' },
        { header: 'Contact', accessor: 'contact_name' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Email', accessor: 'email' },
        {
            header: 'Actions',
            render: (row) => (
                <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>Edit</Button>
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
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Contact Person"
                        value={form.contact_name}
                        onChange={e => setForm({ ...form, contact_name: e.target.value })}
                    />
                    <div className={styles.formRow}>
                        <Input
                            label="Phone"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <Input
                        label="Address"
                        value={form.address}
                        onChange={e => setForm({ ...form, address: e.target.value })}
                    />
                    <Input
                        label="Notes"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                    />
                </form>
            </Modal>
        </div>
    )
}
