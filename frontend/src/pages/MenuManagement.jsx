import React, { useState, useEffect, useContext } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { fetchFoodItems, createFoodItem, updateFoodItem, toggleFoodItemActive, fetchIngredients, fetchRecipes, createRecipe, updateRecipe, apiFetch } from '../api'
import { AuthContext } from '../context/AuthContext'
import styles from './common.module.css'
import imgStyles from './inventory/Ingredients.module.css'

export default function MenuManagement() {
    const [items, setItems] = useState([])
    const [ingredients, setIngredients] = useState([])
    const [recipes, setRecipes] = useState({})
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showRecipeModal, setShowRecipeModal] = useState(false)
    const [showStockModal, setShowStockModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [recipeItem, setRecipeItem] = useState(null)
    const [stockItem, setStockItem] = useState(null)
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
        stock_quantity: null,
        image: null
    })

    const [recipeForm, setRecipeForm] = useState({
        ingredients: [{ ingredient_id: '', quantity: '', unit: '' }]
    })

    const [stockForm, setStockForm] = useState({
        action: 'produce',
        quantity: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [itemsData, ingredientsData, recipesData] = await Promise.all([
                fetchFoodItems(),
                fetchIngredients(),
                fetchRecipes().catch(() => ({ results: [] }))
            ])

            setItems(itemsData.results || itemsData || [])
            setIngredients(ingredientsData.results || ingredientsData || [])

            // Map recipes by food_item_id
            const recipeMap = {}
            const recipesList = recipesData.results || recipesData || []
            recipesList.forEach(recipe => {
                recipeMap[recipe.food_item] = recipe
            })
            setRecipes(recipeMap)
        } catch (err) {
            toast.error('Failed to load data')
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
            stock_quantity: null,
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
            stock_quantity: item.stock_quantity,
            image: null
        })
        setImagePreview(item.image || null)
        setShowModal(true)
    }

    function openRecipeModal(item) {
        setRecipeItem(item)
        const existingRecipe = recipes[item.id]

        if (existingRecipe && existingRecipe.ingredients) {
            setRecipeForm({
                ingredients: existingRecipe.ingredients.map(ing => ({
                    ingredient_id: ing.ingredient,
                    quantity: ing.quantity,
                    unit: ingredients.find(i => i.id === ing.ingredient)?.unit || 'g'
                }))
            })
        } else {
            setRecipeForm({
                ingredients: [{ ingredient_id: '', quantity: '', unit: 'g' }]
            })
        }
        setShowRecipeModal(true)
    }

    function openStockModal(item) {
        setStockItem(item)
        setStockForm({ action: 'produce', quantity: '' })
        setShowStockModal(true)
    }

    function handleImageChange(e) {
        const file = e.target.files[0]
        if (file) {
            setForm({ ...form, image: file })
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
                if (form.stock_quantity !== null && form.stock_quantity !== '') {
                    payload.append('stock_quantity', form.stock_quantity)
                }
                payload.append('image', form.image)
            } else {
                payload = {
                    ...form,
                    price_full: form.price_full || null,
                    price_half: form.available_portions.includes('half') ? form.price_half : null,
                    stock_quantity: form.stock_quantity !== '' ? form.stock_quantity : null
                }
                delete payload.image
            }

            if (editingItem) {
                await updateFoodItem(editingItem.id, payload)
                toast.success('Item updated successfully')
            } else {
                await createFoodItem(payload)
                toast.success('Item added successfully')
            }

            setShowModal(false)
            loadData()
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
            loadData()
        } catch (err) {
            if (err.message && err.message.includes('recipe')) {
                toast.error(err.message)
            } else {
                toast.error('Failed to update item status')
            }
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

    function addRecipeIngredient() {
        setRecipeForm(prev => ({
            ingredients: [...prev.ingredients, { ingredient_id: '', quantity: '', unit: 'g' }]
        }))
    }

    function removeRecipeIngredient(index) {
        setRecipeForm(prev => ({
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }))
    }

    function updateRecipeIngredient(index, field, value) {
        setRecipeForm(prev => ({
            ingredients: prev.ingredients.map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            )
        }))
    }

    async function handleRecipeSubmit(e) {
        e.preventDefault()

        const validIngredients = recipeForm.ingredients.filter(
            ing => ing.ingredient_id && ing.quantity
        )

        if (validIngredients.length < 2) {
            toast.error('Recipe must have at least 2 ingredients')
            return
        }

        setSaving(true)
        try {
            const payload = {
                food_item: recipeItem.id,
                ingredients: validIngredients.map(ing => ({
                    ingredient: parseInt(ing.ingredient_id),
                    quantity: parseFloat(ing.quantity)
                }))
            }

            const existingRecipe = recipes[recipeItem.id]
            if (existingRecipe) {
                await updateRecipe(existingRecipe.id, payload)
                toast.success('Recipe updated successfully')
            } else {
                await createRecipe(payload)
                toast.success('Recipe created successfully')
            }

            setShowRecipeModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to save recipe')
        } finally {
            setSaving(false)
        }
    }

    async function handleStockUpdate(e) {
        e.preventDefault()

        if (!stockForm.quantity || stockForm.quantity <= 0) {
            toast.warning('Please enter a valid quantity')
            return
        }

        setSaving(true)
        try {
            await apiFetch(`/api/food-items/${stockItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: stockForm.action,
                    quantity: parseInt(stockForm.quantity)
                })
            })

            toast.success(`Stock ${stockForm.action === 'produce' ? 'produced' : 'updated'} successfully`)
            setShowStockModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to update stock')
        } finally {
            setSaving(false)
        }
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
            header: 'Recipe',
            render: (row) => {
                const hasRecipe = recipes[row.id]
                const ingredientCount = hasRecipe?.ingredients?.length || 0
                return hasRecipe ? (
                    <Badge variant="success">{ingredientCount} ingredients</Badge>
                ) : (
                    <Badge variant="danger">No recipe</Badge>
                )
            }
        },
        {
            header: 'Stock / Potential',
            render: (row) => {
                const maxProduceable = row.max_daily_production || 0

                if (row.stock_quantity !== null && row.stock_quantity !== undefined) {
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Badge variant={row.stock_quantity > 0 ? 'primary' : 'danger'}>
                                Stock: {row.stock_quantity}
                            </Badge>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Can make: {maxProduceable}
                            </span>
                        </div>
                    )
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Badge variant={maxProduceable > 0 ? 'info' : 'danger'}>
                            Available: {maxProduceable}
                        </Badge>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Made-to-order
                        </span>
                    </div>
                )
            }
        },
        {
            header: 'Price',
            render: (row) => (
                <div>
                    <div>Full: Rs. {row.price_full}</div>
                    {row.price_half && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Half: Rs. {row.price_half}</div>}
                </div>
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
        ...(canEdit ? [{
            header: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>✏️ Edit</Button>
                    <Button size="sm" variant="info" onClick={() => openRecipeModal(row)}>📋 Recipe</Button>
                    {row.stock_quantity !== null && (
                        <Button size="sm" variant="primary" onClick={() => openStockModal(row)}>📦 Stock</Button>
                    )}
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
                subtitle="Manage food items, recipes, and stock"
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

            {/* Add/Edit Item Modal */}
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

                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <Input
                            label="Stock Quantity (optional - leave empty for made-to-order)"
                            type="number"
                            value={form.stock_quantity === null ? '' : form.stock_quantity}
                            onChange={(e) => setForm({ ...form, stock_quantity: e.target.value === '' ? null : parseInt(e.target.value) })}
                            placeholder="Leave empty for made-to-order items"
                        />
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-1)' }}>
                            Set a number for pre-made items (e.g., batch-cooked items). Leave empty for items made on demand.
                        </div>
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

            {/* Recipe Modal */}
            <Modal
                isOpen={showRecipeModal}
                onClose={() => setShowRecipeModal(false)}
                title={`Recipe for ${recipeItem?.name}`}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowRecipeModal(false)}>Cancel</Button>
                        <Button onClick={handleRecipeSubmit} loading={saving}>
                            Save Recipe
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleRecipeSubmit}>
                    <div style={{ marginBottom: 'var(--spacing-3)', padding: 'var(--spacing-3)', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning-border)' }}>
                        <strong>⚠️ Important:</strong> Menu items require at least 2 ingredients to be activated.
                    </div>

                    {recipeForm.ingredients.map((ing, index) => (
                        <div key={index} style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2 }}>
                                <Select
                                    label={index === 0 ? 'Ingredient' : ''}
                                    value={ing.ingredient_id}
                                    onChange={(e) => updateRecipeIngredient(index, 'ingredient_id', e.target.value)}
                                    required
                                >
                                    <option value="">Select ingredient...</option>
                                    {ingredients.map(ingredient => (
                                        <option key={ingredient.id} value={ingredient.id}>
                                            {ingredient.name} ({ingredient.unit})
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <Input
                                    label={index === 0 ? 'Quantity' : ''}
                                    type="number"
                                    step="0.001"
                                    value={ing.quantity}
                                    onChange={(e) => updateRecipeIngredient(index, 'quantity', e.target.value)}
                                    placeholder="0.0"
                                    required
                                />
                            </div>
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => removeRecipeIngredient(index)}
                                disabled={recipeForm.ingredients.length === 1}
                            >
                                ✕
                            </Button>
                        </div>
                    ))}

                    <Button type="button" variant="secondary" onClick={addRecipeIngredient}>
                        + Add Ingredient
                    </Button>
                </form>
            </Modal>

            {/* Stock Management Modal */}
            <Modal
                isOpen={showStockModal}
                onClose={() => setShowStockModal(false)}
                title={`Manage Stock: ${stockItem?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cancel</Button>
                        <Button onClick={handleStockUpdate} loading={saving}>
                            Update Stock
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleStockUpdate}>
                    {stockItem && (
                        <div style={{ marginBottom: 'var(--spacing-4)', padding: 'var(--spacing-3)', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Current Stock</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                                {stockItem.stock_quantity || 0} units
                            </div>
                        </div>
                    )}

                    <Select
                        label="Action"
                        value={stockForm.action}
                        onChange={(e) => setStockForm({ ...stockForm, action: e.target.value })}
                    >
                        <option value="produce">Produce (deduct ingredients)</option>
                        <option value="correct">Manual Adjustment</option>
                    </Select>

                    <div style={{ marginTop: 'var(--spacing-3)' }}>
                        <Input
                            label="Quantity"
                            type="number"
                            value={stockForm.quantity}
                            onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                            placeholder="Enter quantity"
                            required
                        />
                        {stockForm.action === 'produce' && (
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-1)' }}>
                                This will deduct ingredients from inventory according to the recipe.
                            </div>
                        )}
                        {stockForm.action === 'correct' && (
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-1)' }}>
                                Use negative numbers to reduce stock. This does not affect ingredients.
                            </div>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    )
}
