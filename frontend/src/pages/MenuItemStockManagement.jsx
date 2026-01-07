import React, { useState, useEffect, useContext } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../components/ui'
import Input, { Select } from '../components/ui/Input'
import { fetchFoodItems, fetchIngredients, fetchRecipes, apiFetch } from '../api'
import { AuthContext } from '../context/AuthContext'
import styles from './common.module.css'

export default function MenuItemStockManagement() {
    const [items, setItems] = useState([])
    const [ingredients, setIngredients] = useState([])
    const [recipes, setRecipes] = useState({})
    const [stockHistory, setStockHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview') // overview, movements, history

    // Modals
    const [showProductionModal, setShowProductionModal] = useState(false)
    const [showAddStockModal, setShowAddStockModal] = useState(false)
    const [showReduceStockModal, setShowReduceStockModal] = useState(false)
    const [showSetStockModal, setShowSetStockModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)

    const [selectedItem, setSelectedItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterType, setFilterType] = useState('all') // all, pre-made, made-to-order

    const { user } = useContext(AuthContext)
    const toast = useToast()
    const canEdit = user?.role === 'admin' || user?.role === 'manager'

    const [productionForm, setProductionForm] = useState({
        quantity: '',
        batch_number: '',
        notes: ''
    })

    const [addStockForm, setAddStockForm] = useState({
        quantity: '',
        reason: 'production',
        notes: ''
    })

    const [reduceStockForm, setReduceStockForm] = useState({
        quantity: '',
        reason: 'waste',
        notes: ''
    })

    const [setStockForm, setSetStockForm] = useState({
        quantity: '',
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

    async function loadStockHistory(itemId) {
        try {
            // This would call a backend endpoint for stock movements
            // For now, we'll use a placeholder
            const history = []
            setStockHistory(history)
        } catch (err) {
            console.error('Failed to load history:', err)
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

    // Modal Handlers
    function openProductionModal(item) {
        if (!recipes[item.id]) {
            toast.error('This item has no recipe. Please add a recipe first.')
            return
        }
        setSelectedItem(item)
        setProductionForm({
            quantity: '',
            batch_number: `BATCH-${Date.now()}`,
            notes: ''
        })
        setShowProductionModal(true)
    }

    function openAddStockModal(item) {
        setSelectedItem(item)
        setAddStockForm({ quantity: '', reason: 'production', notes: '' })
        setShowAddStockModal(true)
    }

    function openReduceStockModal(item) {
        setSelectedItem(item)
        setReduceStockForm({ quantity: '', reason: 'waste', notes: '' })
        setShowReduceStockModal(true)
    }

    function openSetStockModal(item) {
        setSelectedItem(item)
        setSetStockForm({ quantity: item.stock_quantity || 0, notes: '' })
        setShowSetStockModal(true)
    }

    function openHistoryModal(item) {
        setSelectedItem(item)
        loadStockHistory(item.id)
        setShowHistoryModal(true)
    }

    // Action Handlers
    async function handleProduction(e) {
        e.preventDefault()

        if (!productionForm.quantity || productionForm.quantity <= 0) {
            toast.warning('Please enter a valid quantity')
            return
        }

        setSaving(true)
        try {
            await apiFetch(`/api/food-items/${selectedItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'produce',
                    quantity: parseInt(productionForm.quantity),
                    notes: `Batch: ${productionForm.batch_number}. ${productionForm.notes}`
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

    async function handleAddStock(e) {
        e.preventDefault()

        if (!addStockForm.quantity || addStockForm.quantity <= 0) {
            toast.warning('Please enter a valid quantity')
            return
        }

        setSaving(true)
        try {
            await apiFetch(`/api/food-items/${selectedItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'correct',
                    quantity: parseInt(addStockForm.quantity),
                    notes: `Add Stock - ${addStockForm.reason}: ${addStockForm.notes}`
                })
            })

            toast.success(`Added ${addStockForm.quantity} units to ${selectedItem.name}`)
            setShowAddStockModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to add stock')
        } finally {
            setSaving(false)
        }
    }

    async function handleReduceStock(e) {
        e.preventDefault()

        if (!reduceStockForm.quantity || reduceStockForm.quantity <= 0) {
            toast.warning('Please enter a valid quantity')
            return
        }

        if (reduceStockForm.quantity > selectedItem.stock_quantity) {
            toast.error(`Cannot reduce more than current stock (${selectedItem.stock_quantity})`)
            return
        }

        setSaving(true)
        try {
            await apiFetch(`/api/food-items/${selectedItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'correct',
                    quantity: -parseInt(reduceStockForm.quantity),
                    notes: `Reduce Stock - ${reduceStockForm.reason}: ${reduceStockForm.notes}`
                })
            })

            toast.success(`Reduced ${reduceStockForm.quantity} units from ${selectedItem.name}`)
            setShowReduceStockModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to reduce stock')
        } finally {
            setSaving(false)
        }
    }

    async function handleSetStock(e) {
        e.preventDefault()

        if (setStockForm.quantity === '' || setStockForm.quantity < 0) {
            toast.warning('Please enter a valid quantity')
            return
        }

        setSaving(true)
        try {
            const currentStock = selectedItem.stock_quantity || 0
            const difference = parseInt(setStockForm.quantity) - currentStock

            await apiFetch(`/api/food-items/${selectedItem.id}/update_stock/`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'correct',
                    quantity: difference,
                    notes: `Set Stock to ${setStockForm.quantity}: ${setStockForm.notes}`
                })
            })

            toast.success(`Stock set to ${setStockForm.quantity} for ${selectedItem.name}`)
            setShowSetStockModal(false)
            loadData()
        } catch (err) {
            toast.error(err.message || 'Failed to set stock')
        } finally {
            setSaving(false)
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase())

        let matchesStatusFilter = true
        if (filterStatus === 'in-stock') {
            matchesStatusFilter = item.stock_quantity !== null && item.stock_quantity > 0
        } else if (filterStatus === 'out-of-stock') {
            matchesStatusFilter = item.stock_quantity !== null && item.stock_quantity === 0
        } else if (filterStatus === 'low-stock') {
            matchesStatusFilter = item.stock_quantity !== null && item.stock_quantity > 0 && item.stock_quantity <= 5
        } else if (filterStatus === 'tracked') {
            matchesStatusFilter = item.stock_quantity !== null
        }

        let matchesTypeFilter = true
        if (filterType === 'pre-made') {
            matchesTypeFilter = item.stock_quantity !== null
        } else if (filterType === 'made-to-order') {
            matchesTypeFilter = item.stock_quantity === null
        }

        return matchesSearch && matchesStatusFilter && matchesTypeFilter
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
                    let variant = 'success'
                    if (row.stock_quantity === 0) variant = 'danger'
                    else if (row.stock_quantity <= 5) variant = 'warning'

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
                            {row.stock_quantity > 0 && row.stock_quantity <= 5 && (
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--warning-color)' }}>
                                    Low stock
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
                            <>
                                <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => openAddStockModal(row)}
                                >
                                    ➕ Add
                                </Button>
                                <Button
                                    size="sm"
                                    variant="warning"
                                    onClick={() => openReduceStockModal(row)}
                                >
                                    ➖ Reduce
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openSetStockModal(row)}
                                >
                                    ⚙️ Set
                                </Button>
                                <Button
                                    size="sm"
                                    variant="info"
                                    onClick={() => openHistoryModal(row)}
                                >
                                    📊 History
                                </Button>
                            </>
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
        lowStock: items.filter(i => i.stock_quantity !== null && i.stock_quantity > 0 && i.stock_quantity <= 5).length,
        madeToOrder: items.filter(i => i.stock_quantity === null).length,
        totalUnits: items.reduce((sum, i) => sum + (i.stock_quantity || 0), 0)
    }

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <div>
            <PageHeader
                title="Menu Item Stock Management"
                subtitle="Comprehensive stock tracking, production, and inventory management"
            />

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--spacing-4)',
                marginBottom: 'var(--spacing-6)'
            }}>
                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--primary-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--primary-200)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Total Tracked
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                        {stats.total}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        items
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--success-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--success-border)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        In Stock
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                        {stats.inStock}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {stats.totalUnits} total units
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--warning-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--warning-border)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Low Stock
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                        {stats.lowStock}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        ≤ 5 units
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--danger-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--danger-border)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Out of Stock
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                        {stats.outOfStock}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        needs production
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Made-to-Order
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {stats.madeToOrder}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        no stock tracking
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filterPanel} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
                <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<span>🔍</span>}
                />
                <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">All Types</option>
                    <option value="pre-made">Pre-made Only</option>
                    <option value="made-to-order">Made-to-Order Only</option>
                </Select>
                <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="tracked">Tracked Only</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock (≤5)</option>
                    <option value="out-of-stock">Out of Stock</option>
                </Select>
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
                title={`🏭 Produce: ${selectedItem?.name}`}
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

                            <div style={{
                                marginBottom: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--success-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--success-border)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Maximum Production Capacity
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                                    {calculateMaxProduction(selectedItem)} units
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-1)' }}>
                                    Based on current ingredient availability
                                </div>
                            </div>

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

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Batch Number"
                                    value={productionForm.batch_number}
                                    onChange={(e) => setProductionForm({ ...productionForm, batch_number: e.target.value })}
                                    placeholder="e.g., BATCH-001"
                                />
                            </div>

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Notes (optional)"
                                    value={productionForm.notes}
                                    onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                                    placeholder="e.g., Morning batch, prepared by John"
                                    textarea
                                />
                            </div>

                            <div style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--warning-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--warning-border)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <strong>⚠️ Note:</strong> This will deduct ingredients from inventory according to the recipe and add the produced quantity to menu item stock.
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            {/* Add Stock Modal */}
            <Modal
                isOpen={showAddStockModal}
                onClose={() => setShowAddStockModal(false)}
                title={`➕ Add Stock: ${selectedItem?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddStockModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddStock} loading={saving}>
                            Add Stock
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleAddStock}>
                    {selectedItem && (
                        <>
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

                            <Select
                                label="Reason for Adding"
                                value={addStockForm.reason}
                                onChange={(e) => setAddStockForm({ ...addStockForm, reason: e.target.value })}
                            >
                                <option value="production">Manual Production</option>
                                <option value="correction">Stock Correction</option>
                                <option value="transfer">Transfer from Another Location</option>
                                <option value="found">Found/Recovered Items</option>
                                <option value="other">Other</option>
                            </Select>

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Quantity to Add"
                                    type="number"
                                    value={addStockForm.quantity}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
                                    placeholder="Enter quantity to add"
                                    required
                                    min="1"
                                />
                            </div>

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Notes"
                                    value={addStockForm.notes}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
                                    placeholder="Explain why stock is being added"
                                    textarea
                                    required
                                />
                            </div>

                            <div style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--info-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--info-border)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <strong>ℹ️ Note:</strong> This will add stock WITHOUT deducting ingredients. Use "Produce" if you want to deduct ingredients.
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            {/* Reduce Stock Modal */}
            <Modal
                isOpen={showReduceStockModal}
                onClose={() => setShowReduceStockModal(false)}
                title={`➖ Reduce Stock: ${selectedItem?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowReduceStockModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleReduceStock} loading={saving} variant="warning">
                            Reduce Stock
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleReduceStock}>
                    {selectedItem && (
                        <>
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

                            <Select
                                label="Reason for Reduction"
                                value={reduceStockForm.reason}
                                onChange={(e) => setReduceStockForm({ ...reduceStockForm, reason: e.target.value })}
                            >
                                <option value="waste">Waste/Spoilage</option>
                                <option value="damage">Damaged Items</option>
                                <option value="donation">Donation</option>
                                <option value="staff_meal">Staff Meal</option>
                                <option value="quality_issue">Quality Issue</option>
                                <option value="correction">Stock Correction</option>
                                <option value="other">Other</option>
                            </Select>

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Quantity to Reduce"
                                    type="number"
                                    value={reduceStockForm.quantity}
                                    onChange={(e) => setReduceStockForm({ ...reduceStockForm, quantity: e.target.value })}
                                    placeholder="Enter quantity to reduce"
                                    required
                                    min="1"
                                    max={selectedItem.stock_quantity}
                                />
                            </div>

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Notes"
                                    value={reduceStockForm.notes}
                                    onChange={(e) => setReduceStockForm({ ...reduceStockForm, notes: e.target.value })}
                                    placeholder="Explain why stock is being reduced"
                                    textarea
                                    required
                                />
                            </div>

                            <div style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--warning-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--warning-border)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <strong>⚠️ Warning:</strong> This action will permanently reduce stock. Make sure to document the reason properly.
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            {/* Set Stock Modal */}
            <Modal
                isOpen={showSetStockModal}
                onClose={() => setShowSetStockModal(false)}
                title={`⚙️ Set Stock Level: ${selectedItem?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowSetStockModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSetStock} loading={saving}>
                            Set Stock
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSetStock}>
                    {selectedItem && (
                        <>
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

                            <Input
                                label="New Stock Level"
                                type="number"
                                value={setStockForm.quantity}
                                onChange={(e) => setStockForm({ ...setStockForm, quantity: e.target.value })}
                                placeholder="Enter new stock level"
                                required
                                min="0"
                            />

                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Reason for Change"
                                    value={setStockForm.notes}
                                    onChange={(e) => setStockForm({ ...setStockForm, notes: e.target.value })}
                                    placeholder="Explain why you're setting this stock level"
                                    textarea
                                    required
                                />
                            </div>

                            <div style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--info-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--info-border)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <strong>ℹ️ Note:</strong> This will set the stock to exactly the number you specify, regardless of the current stock level. Use this for physical inventory counts.
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            {/* History Modal */}
            <Modal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title={`📊 Stock History: ${selectedItem?.name}`}
                size="lg"
            >
                <div>
                    <div style={{ marginBottom: 'var(--spacing-4)', padding: 'var(--spacing-3)', backgroundColor: 'var(--info-bg)', borderRadius: 'var(--radius-md)' }}>
                        <strong>ℹ️ Coming Soon:</strong> Detailed stock movement history will be displayed here, including:
                        <ul style={{ marginTop: 'var(--spacing-2)', paddingLeft: '20px' }}>
                            <li>Production records</li>
                            <li>Stock adjustments</li>
                            <li>Sales/consumption</li>
                            <li>Waste/spoilage</li>
                            <li>Date and time of each movement</li>
                            <li>User who made the change</li>
                        </ul>
                    </div>

                    {stockHistory.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--text-secondary)' }}>
                            No stock history available yet
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
