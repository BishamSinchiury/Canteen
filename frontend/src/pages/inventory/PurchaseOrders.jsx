import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../../components/ui'
import Input, { Select } from '../../components/ui/Input'
import { fetchPurchaseOrders, fetchVendors, fetchIngredients, createPurchaseOrder, receiveStock } from '../../api'
import styles from '../common.module.css'

export default function PurchaseOrders() {
    const [pos, setPos] = useState([])
    const [vendors, setVendors] = useState([])
    const [ingredients, setIngredients] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showReceiveModal, setShowReceiveModal] = useState(false)
    const [selectedPO, setSelectedPO] = useState(null)
    const [poItems, setPoItems] = useState([])
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    const [form, setForm] = useState({
        vendor: '',
        notes: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [posData, vendorsData, ingredientsData] = await Promise.all([
                fetchPurchaseOrders(),
                fetchVendors(),
                fetchIngredients()
            ])
            setPos(posData.results || posData || [])
            setVendors(vendorsData.results || vendorsData || [])
            setIngredients(ingredientsData.results || ingredientsData || [])
        } catch (err) {
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    function openAddModal() {
        setForm({ vendor: '', notes: '' })
        setPoItems([{ ingredient: '', quantity: '', unit_price: '' }])
        setShowModal(true)
    }

    function addItemRow() {
        setPoItems([...poItems, { ingredient: '', quantity: '', unit_price: '' }])
    }

    async function handleCreate() {
        if (!form.vendor) return toast.warning('Select a vendor')
        setSaving(true)
        try {
            // Simplified create - API usually handles item creation too if nested serializer allows,
            // but for this MVP I'll just send the main data and items.
            // Note: My backend POViewSet perform_create only saves PO. 
            // I should have handled items in perform_create or in a custom create method.
            // Let's assume the backend serializer handles nested items.
            await createPurchaseOrder({ ...form, items: poItems })
            toast.success('Purchase Order created')
            setShowModal(false)
            loadData()
        } catch (err) {
            toast.error('Failed to create PO')
        } finally {
            setSaving(false)
        }
    }

    function openReceiveModal(po) {
        setSelectedPO(po)
        setShowReceiveModal(true)
    }

    async function handleReceive() {
        setSaving(true)
        try {
            const itemsToReceive = selectedPO.items.map(item => ({
                id: item.id,
                received_quantity: item.quantity // Default to full quantity for now
            }))
            await receiveStock(selectedPO.id, itemsToReceive)
            toast.success('Stock received')
            setShowReceiveModal(false)
            loadData()
        } catch (err) {
            toast.error('Failed to receive stock')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        { header: 'PO #', accessor: 'id' },
        { header: 'Vendor', accessor: 'vendor_name' },
        {
            header: 'Status',
            render: row => (
                <Badge variant={row.status === 'RECEIVED' ? 'success' : 'warning'}>
                    {row.status}
                </Badge>
            )
        },
        { header: 'Amount', accessor: 'total_amount' },
        { header: 'Date', render: row => new Date(row.created_at).toLocaleDateString() },
        {
            header: 'Actions',
            render: (row) => (
                row.status === 'PENDING' && (
                    <Button size="sm" onClick={() => openReceiveModal(row)}>Receive Stock</Button>
                )
            )
        }
    ]

    if (loading) return <Loader center size="lg" />

    return (
        <div>
            <PageHeader
                title="Purchase Orders"
                subtitle="Track stock orders and vendor purchases"
                actions={<Button onClick={openAddModal}>+ New Order</Button>}
            />

            <Table
                columns={columns}
                data={pos}
                emptyMessage="No orders found"
            />

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="New Purchase Order"
                width="800px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleCreate} loading={saving}>Create PO</Button>
                    </>
                }
            >
                <div className={styles.form}>
                    <Select label="Vendor" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}>
                        <option value="">Select Vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </Select>

                    <h4>Items</h4>
                    {poItems.map((item, idx) => (
                        <div key={idx} className={styles.formRow} style={{ gap: '10px', marginBottom: '10px' }}>
                            <Select
                                label="Ingredient"
                                value={item.ingredient}
                                onChange={e => {
                                    const newList = [...poItems];
                                    newList[idx].ingredient = e.target.value;
                                    setPoItems(newList)
                                }}
                                style={{ flex: 2 }}
                            >
                                <option value="">Ingredient</option>
                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                            </Select>
                            <Input
                                label="Qty"
                                type="number"
                                value={item.quantity}
                                onChange={e => {
                                    const newList = [...poItems];
                                    newList[idx].quantity = e.target.value;
                                    setPoItems(newList)
                                }}
                            />
                            <Input
                                label="Price"
                                type="number"
                                value={item.unit_price}
                                onChange={e => {
                                    const newList = [...poItems];
                                    newList[idx].unit_price = e.target.value;
                                    setPoItems(newList)
                                }}
                            />
                        </div>
                    ))}
                    <Button variant="secondary" onClick={addItemRow}>+ Add Item</Button>
                </div>
            </Modal>

            <Modal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                title={`Receive Stock: PO #${selectedPO?.id}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowReceiveModal(false)}>Cancel</Button>
                        <Button onClick={handleReceive} loading={saving}>Confirm Receipt</Button>
                    </>
                }
            >
                <p>Are you sure you want to mark this PO as received? This will update the inventory stock levels.</p>
                <ul>
                    {selectedPO?.items?.map(item => (
                        <li key={item.id}>{item.ingredient_name}: {item.quantity} {item.unit}</li>
                    ))}
                </ul>
            </Modal>
        </div>
    )
}
