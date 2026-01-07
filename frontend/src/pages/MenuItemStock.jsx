import React, { useState, useEffect, useContext } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { fetchFoodItems, fetchIngredients, fetchRecipes, apiFetch } from '../api'
import { AuthContext } from '../context/AuthContext'
import styles from './common.module.css'

export default function MenuItemStock() {
    const [items, setItems] = useState([])
    const [ingredients, setIngredients] = useState([])
    const [recipes, setRecipes] = useState({})
    const [loading, setLoading] = useState(true)
    const [showProductionModal, setShowProductionModal] = useState(false)
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all') // all, in-stock, out-of-stock

    const { user } = useContext(AuthContext)
    const toast = useToast()
    const canEdit = user?.role === 'admin' || user?.role === 'manager'

    const [productionForm, setProductionForm] = useState({
        quantity: '',
        notes: ''
    })

    const [adjustForm, setAdjustForm] = useState({
        quantity: '',
        reason: 'correction',
        notes: ''
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

    function openProductionModal(item) {
        if (!recipes[item.id]) {
            toast.error('This item has no recipe. Please add a recipe first.')
            return
        }

        setSelectedItem(item)
        setProductionForm({ quantity: '', notes: '' })
        setShowProductionModal(true)
    }

    function openAdjustModal(item) {
        setSelectedItem(item)
        setAdjustForm({ quantity: '', reason: 'correction', notes: '' })
        setShowAdjustModal(true)
    }

    async function handleProduction(e) {
        e.preventDefault()

        if (!productionForm.quantity || productionForm.quantity <= 0) {
            toast.warning('Please enter a valid quantity')
            return
        }

        setSaving(true)
        try {
            const response = await apiFetch(`/api/menu/food-items/${selectedItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'produce',
                    quantity: parseInt(productionForm.quantity),
                    notes: productionForm.notes
                })
            })

            toast.success(`Successfully produced ${productionForm.quantity} ${selectedItem.name}`)
            setShowProductionModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to produce items')
        } finally {
            setSaving(false)
        }
    }

    async function handleAdjustment(e) {
        e.preventDefault()

        if (!adjustForm.quantity) {
            toast.warning('Please enter a quantity')
            return
        }

        setSaving(true)
        try {
            await apiFetch(`/api/menu/food-items/${selectedItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'correct',
                    quantity: parseInt(adjustForm.quantity),
                    notes: adjustForm.notes
                })
            })

            toast.success('Stock adjusted successfully')
            setShowAdjustModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to adjust stock')
        } finally {
            setSaving(false)
        }
    }

    async function getAvailability(itemId) {
        try {
            const data = await apiFetch(`/api/menu/food-items/${itemId}/availability/`)
            return data
        } catch (err) {
            return null
        }
    }

    function calculateMaxProduction(item) {
        const recipe = recipes[item.id]
        if (!recipe || !recipe.ingredients) return 0

        let minPossible = Infinity
        for (const recipeIng of recipe.ingredients) {
            const ingredient = ingredients.find(i => i.id === recipeIng.ingredient)
            if (!ingredient) continue

            const possible = Math.floor(ingredient.current_quantity / recipeIng.quantity)
            minPossible = Math.min(minPossible, possible)
        }

        return minPossible === Infinity ? 0 : minPossible
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase())

        let matchesFilter = true
        if (filterStatus === 'in-stock') {
            matchesFilter = item.stock_quantity !== null && item.stock_quantity > 0
        } else if (filterStatus === 'out-of-stock') {
            matchesFilter = item.stock_quantity !== null && item.stock_quantity === 0
        } else if (filterStatus === 'tracked') {
            matchesFilter = item.stock_quantity !== null
        }

        return matchesSearch && matchesFilter
    })

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
                            {row.category || 'No category'}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Type',
            render: (row) => {
                if (row.stock_quantity !== null && row.stock_quantity !== undefined) {
                    return <Badge variant="primary">Pre-made</Badge>
                }
                return <Badge variant="secondary">Made-to-order</Badge>
            }
        },
        {
            header: 'Current Stock',
            render: (row) => {
                if (row.stock_quantity !== null && row.stock_quantity !== undefined) {
                    const variant = row.stock_quantity > 0 ? 'success' : 'danger'
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Badge variant={variant}>
                                {row.stock_quantity} units
                            </Badge>
                            {row.stock_quantity === 0 && (
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--danger-color)' }}>
                                    Out of stock
                                </span>
                            )}
                        </div>
                    )
                }
                return <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>N/A</span>
            }
        },
        {
            header: 'Recipe',
            render: (row) => {
                const recipe = recipes[row.id]
                if (recipe && recipe.ingredients) {
                    return (
                        <Badge variant="success">
                            {recipe.ingredients.length} ingredients
                        </Badge>
                    )
                }
                return <Badge variant="danger">No recipe</Badge>
            }
        },
        {
            header: 'Can Produce',
            render: (row) => {
                if (row.stock_quantity === null) {
                    return <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>N/A</span>
                }

                const maxProd = calculateMaxProduction(row)
                const variant = maxProd > 10 ? 'success' : maxProd > 0 ? 'warning' : 'danger'

                return (
                    <Badge variant={variant}>
                        {maxProd} units
                    </Badge>
                )
            }
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
            render: (row) => {
                const hasStock = row.stock_quantity !== null && row.stock_quantity !== undefined
                const hasRecipe = recipes[row.id]

                return (
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                        {hasStock && hasRecipe && (
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openProductionModal(row)}
                            >
                                🏭 Produce
                            </Button>
                        )}
                        {hasStock && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openAdjustModal(row)}
                            >
                                ⚙️ Adjust
                            </Button>
                        )}
                        {!hasStock && (
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Made-to-order
                            </span>
                        )}
                    </div>
                )
            }
        }] : [])
    ]

    // Calculate summary stats
    const stats = {
        total: items.filter(i => i.stock_quantity !== null).length,
        inStock: items.filter(i => i.stock_quantity !== null && i.stock_quantity > 0).length,
        outOfStock: items.filter(i => i.stock_quantity !== null && i.stock_quantity === 0).length,
        madeToOrder: items.filter(i => i.stock_quantity === null).length
    }

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Menu Item Stock Management"
                subtitle="Track and manage daily production of menu items"
            />

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-4)',
                marginBottom: 'var(--spacing-6)'
            }}>
                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--primary-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--primary-200)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Total Tracked Items
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                        {stats.total}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--success-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--success-border)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        In Stock
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                        {stats.inStock}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--danger-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--danger-border)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Out of Stock
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                        {stats.outOfStock}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Made-to-Order
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {stats.madeToOrder}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filterPanel} style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
                <div style={{ flex: 1 }}>
                    <Input
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<span>🔍</span>}
                    />
                </div>
                <div style={{ minWidth: '200px' }}>
                    <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Items</option>
                        <option value="tracked">Tracked Only</option>
                        <option value="in-stock">In Stock</option>
                        <option value="out-of-stock">Out of Stock</option>
                    </Select>
                </div>
            </div>

            {/* Items Table */}
            <Table
                columns={columns}
                data={filteredItems}
                emptyMessage="No menu items found"
            />

            {/* Production Modal */}
            <Modal
                isOpen={showProductionModal}
                onClose={() => setShowProductionModal(false)}
                title={`Produce: ${selectedItem?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowProductionModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleProduction} loading={saving}>
                            Produce Items
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleProduction}>
                    {selectedItem && (
                        <>
                            {/* Current Stock */}
                            <div style={{
                                marginBottom: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--gray-50)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Current Stock
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                                    {selectedItem.stock_quantity || 0} units
                                </div>
                            </div>

                            {/* Max Production */}
                            <div style={{
                                marginBottom: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--success-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--success-border)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Maximum You Can Produce
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                                    {calculateMaxProduction(selectedItem)} units
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-1)' }}>
                                    Based on current ingredient availability
                                </div>
                            </div>

                            {/* Recipe Info */}
                            {recipes[selectedItem.id] && (
                                <div style={{
                                    marginBottom: 'var(--spacing-4)',
                                    padding: 'var(--spacing-3)',
                                    backgroundColor: 'var(--info-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--info-border)'
                                }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-2)' }}>
                                        Recipe (per unit):
                                    </div>
                                    {recipes[selectedItem.id].ingredients.map((ing, idx) => {
                                        const ingredient = ingredients.find(i => i.id === ing.ingredient)
                                        return (
                                            <div key={idx} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                                                • {ingredient?.name}: {ing.quantity} {ingredient?.unit}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Quantity Input */}
                            <Input
                                label="Quantity to Produce"
                                type="number"
                                value={productionForm.quantity}
                                onChange={(e) => setProductionForm({ ...productionForm, quantity: e.target.value })}
                                placeholder="Enter quantity"
                                required
                                min="1"
                                max={calculateMaxProduction(selectedItem)}
                            />

                            {/* Notes */}
                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Notes (optional)"
                                    value={productionForm.notes}
                                    onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                                    placeholder="e.g., Morning batch"
                                    textarea
                                />
                            </div>

                            {/* Warning */}
                            <div style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--warning-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--warning-border)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <strong>⚠️ Note:</strong> This will deduct ingredients from inventory according to the recipe.
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            {/* Adjustment Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => setShowAdjustModal(false)}
                title={`Adjust Stock: ${selectedItem?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdjustment} loading={saving}>
                            Adjust Stock
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleAdjustment}>
                    {selectedItem && (
                        <>
                            {/* Current Stock */}
                            <div style={{
                                marginBottom: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--gray-50)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Current Stock
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                                    {selectedItem.stock_quantity || 0} units
                                </div>
                            </div>

                            {/* Reason */}
                            <Select
                                label="Reason"
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                            >
                                <option value="correction">Stock Correction</option>
                                <option value="waste">Waste/Spoilage</option>
                                <option value="damage">Damaged Items</option>
                                <option value="donation">Donation</option>
                                <option value="other">Other</option>
                            </Select>

                            {/* Quantity */}
                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Adjustment Quantity"
                                    type="number"
                                    value={adjustForm.quantity}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                                    placeholder="Use negative to reduce (e.g., -5)"
                                    required
                                />
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-1)' }}>
                                    Positive numbers add stock, negative numbers reduce stock
                                </div>
                            </div>

                            {/* Notes */}
                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Notes"
                                    value={adjustForm.notes}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                                    placeholder="Explain the adjustment"
                                    textarea
                                    required
                                />
                            </div>

                            {/* Info */}
                            <div style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--info-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--info-border)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <strong>ℹ️ Note:</strong> Manual adjustments do NOT affect ingredient inventory. Use this for corrections, waste, or other non-production changes.
                            </div>
                        </>
                    )}
                </form>
            </Modal>
        </div>
    )
}
