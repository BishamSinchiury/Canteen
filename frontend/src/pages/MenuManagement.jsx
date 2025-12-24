import React, { useState, useEffect, useContext } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { fetchFoodItems, createFoodItem, updateFoodItem, toggleFoodItemActive } from '../api'
import { AuthContext } from '../context/AuthContext'
import styles from './common.module.css'
import imgStyles from './inventory/Ingredients.module.css'

export default function MenuManagement() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [imagePreview, setImagePreview] = useState(null)

    const { user } = useContext(AuthContext)
    const toast = useToast()
    const canEdit = user?.role === 'admin' || user?.role === 'manager'

    const [form, setForm] = useState({
        name: '',
        description: '',
        category: '',
        available_portions: ['full'],
        price_full: '',
        price_half: '',
        is_active: true,
        image: null
    })

    useEffect(() => {
        loadItems()
    }, [])

    async function loadItems() {
        try {
            const data = await fetchFoodItems()
            setItems(data.results || data || [])
        } catch (err) {
            toast.error('Failed to load menu items')
        } finally {
            setLoading(false)
        }
    }

    function openAddModal() {
        setEditingItem(null)
        setForm({
            name: '',
            description: '',
            category: '',
            available_portions: ['full'],
            price_full: '',
            price_half: '',
            is_active: true,
            image: null
        })
        setImagePreview(null)
        setShowModal(true)
    }

    function openEditModal(item) {
        setEditingItem(item)
        setForm({
            name: item.name,
            description: item.description || '',
            category: item.category || '',
            available_portions: item.available_portions || ['full'],
            price_full: item.price_full || '',
            price_half: item.price_half || '',
            is_active: item.is_active,
            image: null
        })
        setImagePreview(item.image || null)
        setShowModal(true)
    }

    function handleImageChange(e) {
        const file = e.target.files[0]
        if (file) {
            setForm({ ...form, image: file })
            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    function clearImage() {
        setForm({ ...form, image: null })
        setImagePreview(editingItem?.image || null)
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!form.name || !form.price_full) {
            toast.warning('Name and price are required')
            return
        }

        setSaving(true)
        try {
            // Use FormData if image is included
            let payload
            if (form.image instanceof File) {
                payload = new FormData()
                payload.append('name', form.name)
                payload.append('description', form.description)
                payload.append('category', form.category)
                payload.append('available_portions', JSON.stringify(form.available_portions))
                payload.append('price_full', form.price_full || '')
                payload.append('price_half', form.available_portions.includes('half') ? form.price_half : '')
                payload.append('is_active', form.is_active)
                payload.append('image', form.image)
            } else {
                payload = {
                    ...form,
                    price_full: form.price_full || null,
                    price_half: form.available_portions.includes('half') ? form.price_half : null
                }
                delete payload.image // Don't send null image
            }

            if (editingItem) {
                await updateFoodItem(editingItem.id, payload)
                toast.success('Item updated successfully')
            } else {
                await createFoodItem(payload)
                toast.success('Item added successfully')
            }

            setShowModal(false)
            loadItems()
        } catch (err) {
            toast.error(err.message || 'Failed to save item')
        } finally {
            setSaving(false)
        }
    }

    async function handleToggleActive(item) {
        try {
            await toggleFoodItemActive(item.id)
            toast.success(`${item.name} ${item.is_active ? 'deactivated' : 'activated'}`)
            loadItems()
        } catch (err) {
            toast.error('Failed to update item status')
        }
    }

    function handlePortionChange(portion) {
        setForm(prev => {
            const portions = prev.available_portions.includes(portion)
                ? prev.available_portions.filter(p => p !== portion)
                : [...prev.available_portions, portion]
            return { ...prev, available_portions: portions.length > 0 ? portions : ['full'] }
        })
    }

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const columns = [
        {
            header: 'Item',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {row.image ? (
                        <img src={row.image} alt={row.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '50px', height: '50px', borderRadius: '8px', backgroundColor: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🍽️</div>
                    )}
                    <div>
                        <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{row.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            {row.category}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Portions',
            render: (row) => row.available_portions?.map(p => (
                <Badge key={p} variant="primary" style={{ marginRight: '4px' }}>{p}</Badge>
            ))
        },
        {
            header: 'Full Price',
            render: (row) => row.price_full ? `Rs. ${row.price_full}` : '-'
        },
        {
            header: 'Half Price',
            render: (row) => row.price_half ? `Rs. ${row.price_half}` : '-'
        },
        {
            header: 'Status',
            render: (row) => (
                <Badge variant={row.is_active ? 'success' : 'danger'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        ...(canEdit ? [{
            header: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>✏️ Edit</Button>
                    <Button
                        size="sm"
                        variant={row.is_active ? 'warning' : 'success'}
                        onClick={() => handleToggleActive(row)}
                    >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                </div>
            )
        }] : [])
    ]

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Menu Management"
                subtitle="Manage food items and prices"
                actions={canEdit && <Button onClick={openAddModal}>+ Add Item</Button>}
            />

            <div className={styles.filterPanel} style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div style={{ flex: 1 }}>
                    <Input
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<span>🔍</span>}
                    />
                </div>
            </div>

            <Table
                columns={columns}
                data={filteredItems}
                emptyMessage="No menu items found"
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            {editingItem ? 'Update Item' : 'Add Item'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <Input
                            label="Item Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            placeholder="e.g., Dal Bhat"
                        />
                        <Input
                            label="Category"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            placeholder="e.g., Main Course"
                        />
                    </div>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            textarea
                            placeholder="Brief description of the item"
                        />
                    </div>

                    {/* Image Upload Section */}
                    <div className={imgStyles.imageUploadSection} style={{ marginTop: 'var(--spacing-4)' }}>
                        <label className={imgStyles.imageLabel}>Item Image</label>
                        {imagePreview && (
                            <div className={imgStyles.imagePreviewContainer}>
                                <img src={imagePreview} alt="Preview" className={imgStyles.imagePreview} />
                                <button
                                    type="button"
                                    onClick={clearImage}
                                    className={imgStyles.clearImageBtn}
                                    title="Remove image"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className={imgStyles.fileInput}
                            id="menuImageUpload"
                        />
                        <label htmlFor="menuImageUpload" className={imgStyles.fileInputLabel}>
                            {imagePreview ? 'Change Image' : 'Upload Image'}
                        </label>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'var(--font-weight-medium)' }}>
                            Available Portions
                        </label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={form.available_portions.includes('full')}
                                    onChange={() => handlePortionChange('full')}
                                />
                                Full Portion
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={form.available_portions.includes('half')}
                                    onChange={() => handlePortionChange('half')}
                                />
                                Half Portion
                            </label>
                        </div>
                    </div>

                    <div className={styles.formRow} style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Full Price (Rs.)"
                            type="number"
                            step="0.01"
                            value={form.price_full}
                            onChange={(e) => setForm({ ...form, price_full: e.target.value })}
                            required
                            placeholder="0.00"
                        />
                        {form.available_portions.includes('half') && (
                            <Input
                                label="Half Price (Rs.)"
                                type="number"
                                step="0.01"
                                value={form.price_half}
                                onChange={(e) => setForm({ ...form, price_half: e.target.value })}
                                placeholder="0.00"
                            />
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    )
}
