import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/Layout'
import { Button, Badge, Loader, useToast, Modal } from '../../components/ui'
import Input, { Select } from '../../components/ui/Input'
import { fetchIngredients, createIngredient, updateIngredient, adjustStock } from '../../api'
import styles from './Ingredients.module.css'
import commonStyles from '../common.module.css'

export default function Ingredients() {
    const [ingredients, setIngredients] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState(null)
    const [saving, setSaving] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)
    const toast = useToast()

    const [errors, setErrors] = useState({})

    const [form, setForm] = useState({
        name: '',
        unit: 'kg',
        reorder_level: 0,
        image: null
    })

    const [adjustForm, setAdjustForm] = useState({
        quantity: '',
        movement_type: 'IN',
        reason: 'PURCHASE',
        notes: ''
    })

    useEffect(() => {
        loadIngredients()
    }, [])

    async function loadIngredients() {
        try {
            const data = await fetchIngredients()
            setIngredients(data.results || data || [])
        } catch (err) {
            toast.error('Failed to load ingredients')
        } finally {
            setLoading(false)
        }
    }

    function openAddModal() {
        setSelectedIngredient(null)
        setForm({ name: '', unit: 'kg', reorder_level: 0, image: null })
        setImagePreview(null)
        setErrors({})
        setShowModal(true)
    }

    function openEditModal(ing) {
        setSelectedIngredient(ing)
        setForm({ name: ing.name, unit: ing.unit, reorder_level: ing.reorder_level, image: null })
        setImagePreview(ing.image || null)
        setErrors({})
        setShowModal(true)
    }

    function openAdjustModal(ing) {
        setSelectedIngredient(ing)
        setAdjustForm({ quantity: '', movement_type: 'IN', reason: 'PURCHASE', notes: '' })
        setErrors({})
        setShowAdjustModal(true)
    }

    function handleInputChange(field, value, isAdjust = false) {
        if (isAdjust) {
            setAdjustForm(prev => ({ ...prev, [field]: value }))
        } else {
            setForm(prev => ({ ...prev, [field]: value }))
        }
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }))
        }
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
        setImagePreview(selectedIngredient?.image || null)
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const newErrors = {}
        if (!form.name.trim()) newErrors.name = 'Name is required'
        if (parseFloat(form.reorder_level) < 0) newErrors.reorder_level = 'Cannot be negative'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setSaving(true)
        setErrors({})

        try {
            // Use FormData if image is included
            let payload
            if (form.image instanceof File) {
                payload = new FormData()
                payload.append('name', form.name)
                payload.append('unit', form.unit)
                payload.append('reorder_level', form.reorder_level)
                payload.append('image', form.image)
            } else {
                payload = {
                    name: form.name,
                    unit: form.unit,
                    reorder_level: form.reorder_level
                }
            }

            if (selectedIngredient) {
                await updateIngredient(selectedIngredient.id, payload)
                toast.success('Ingredient updated')
            } else {
                await createIngredient(payload)
                toast.success('Ingredient created')
            }
            setShowModal(false)
            loadIngredients()
        } catch (err) {
            console.error(err)
            const serverErrors = {}
            let genericMsg = err.message || 'Failed to save ingredient'

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

    async function handleAdjust(e) {
        e.preventDefault()

        const newErrors = {}
        if (!adjustForm.quantity || parseFloat(adjustForm.quantity) <= 0) {
            newErrors.quantity = 'Valid quantity is required'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setSaving(true)
        setErrors({})
        try {
            await adjustStock(selectedIngredient.id, adjustForm)
            toast.success('Stock adjusted')
            setShowAdjustModal(false)
            loadIngredients()
        } catch (err) {
            console.error(err)
            const serverErrors = {}
            let genericMsg = err.message || 'Adjustment failed'

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

    if (loading) return <Loader center size="lg" />

    return (
        <div>
            <PageHeader
                title="Kitchen Inventory"
                subtitle="Manage ingredients and monitor stock levels"
                actions={<Button onClick={openAddModal}>+ Add Ingredient</Button>}
            />

            {/* Card Grid Layout */}
            <div className={styles.cardGrid}>
                {ingredients.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📦</div>
                        <h3>No ingredients found</h3>
                        <p>Start by adding your first ingredient</p>
                    </div>
                ) : (
                    ingredients.map(ing => (
                        <div key={ing.id} className={styles.ingredientCard}>
                            <div className={styles.cardImage}>
                                {ing.image ? (
                                    <img src={ing.image} alt={ing.name} />
                                ) : (
                                    <div className={styles.imagePlaceholder}>📦</div>
                                )}
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{ing.name}</h3>
                                <div className={styles.stockInfo}>
                                    <div className={styles.stockAmount}>
                                        <span className={styles.quantity} style={{
                                            color: ing.current_quantity <= ing.reorder_level ? 'var(--danger-color)' : 'var(--success-color)'
                                        }}>
                                            {parseFloat(ing.current_quantity).toFixed(2)}
                                        </span>
                                        <span className={styles.unit}>{ing.unit}</span>
                                    </div>
                                    {ing.current_quantity <= ing.reorder_level && (
                                        <Badge variant="danger" size="sm">Low Stock</Badge>
                                    )}
                                </div>
                                <div className={styles.reorderLevel}>
                                    Min Level: {parseFloat(ing.reorder_level).toFixed(2)} {ing.unit}
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <Button size="sm" variant="secondary" onClick={() => openEditModal(ing)} style={{ flex: 1 }} title="Edit ingredient details and image">
                                    ✏️ Edit
                                </Button>
                                <Button size="sm" onClick={() => openAdjustModal(ing)} style={{ flex: 1 }} title="Adjust stock quantity">
                                    📊 Stock
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={selectedIngredient ? 'Edit Ingredient' : 'Add Ingredient'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={saving}>Save</Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className={commonStyles.form}>
                    <Input
                        label="Name"
                        value={form.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        error={errors.name}
                        required
                    />
                    <Select
                        label="Unit"
                        value={form.unit}
                        onChange={e => handleInputChange('unit', e.target.value)}
                        error={errors.unit}
                    >
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="l">Liter (l)</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="pc">Piece (pc)</option>
                        <option value="pkt">Packet (pkt)</option>
                    </Select>
                    <Input
                        label="Minimum Stock Level (Alert Threshold)"
                        type="number"
                        step="0.01"
                        value={form.reorder_level}
                        onChange={e => handleInputChange('reorder_level', e.target.value)}
                        error={errors.reorder_level}
                        placeholder="e.g. 5.0"
                    />

                    {/* Image Upload */}
                    <div className={styles.imageUploadSection}>
                        <label className={styles.imageLabel}>Image</label>
                        {imagePreview && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                                <button
                                    type="button"
                                    onClick={clearImage}
                                    className={styles.clearImageBtn}
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
                            className={styles.fileInput}
                            id="imageUpload"
                        />
                        <label htmlFor="imageUpload" className={styles.fileInputLabel}>
                            {imagePreview ? 'Change Image' : 'Upload Image'}
                        </label>
                    </div>
                </form>
            </Modal>

            {/* Adjust Stock Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => setShowAdjustModal(false)}
                title={`Adjust Stock: ${selectedIngredient?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
                        <Button onClick={handleAdjust} loading={saving}>Confirm</Button>
                    </>
                }
            >
                <form onSubmit={handleAdjust} className={commonStyles.form}>
                    <Select
                        label="Type"
                        value={adjustForm.movement_type}
                        onChange={e => handleInputChange('movement_type', e.target.value, true)}
                        error={errors.movement_type}
                    >
                        <option value="IN">Stock In (+)</option>
                        <option value="OUT">Stock Out (-)</option>
                        <option value="ADJUST">Set Absolute Value (=)</option>
                    </Select>
                    <Input
                        label="Quantity"
                        type="number"
                        step="0.001"
                        value={adjustForm.quantity}
                        onChange={e => handleInputChange('quantity', e.target.value, true)}
                        error={errors.quantity}
                        required
                    />
                    <Select
                        label="Reason"
                        value={adjustForm.reason}
                        onChange={e => handleInputChange('reason', e.target.value, true)}
                        error={errors.reason}
                    >
                        <option value="PURCHASE">Purchase</option>
                        <option value="CONSUMPTION">Consumption</option>
                        <option value="WASTAGE">Wastage</option>
                        <option value="SPOILAGE">Spoilage</option>
                        <option value="AUDIT">Audit Correction</option>
                    </Select>
                    <Input
                        label="Notes"
                        value={adjustForm.notes}
                        onChange={e => handleInputChange('notes', e.target.value, true)}
                        error={errors.notes}
                    />
                </form>
            </Modal>
        </div>
    )
}
