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

    const [errors, setErrors] = useState({})

    const [form, setForm] = useState({
        vendor: '',
        payment_method: 'CREDIT',
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
        setForm({ vendor: '', payment_method: 'CREDIT', notes: '' })
        setPoItems([{ ingredient: '', quantity: '', unit_price: '' }])
        setErrors({})
        setShowModal(true)
    }

    function addItemRow() {
        setPoItems([...poItems, { ingredient: '', quantity: '', unit_price: '' }])
    }

    async function handleCreate() {
        const newErrors = {}
        if (form.payment_method === 'CREDIT' && !form.vendor) newErrors.vendor = 'Vendor is required for credit purchases'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return form.payment_method === 'CREDIT' && !form.vendor ? toast.warning('Select a vendor') : null
        }

        setSaving(true)
        setErrors({})
        try {
            await createPurchaseOrder({ ...form, items: poItems })
            toast.success('Purchase Order created')
            setShowModal(false)
            loadData()
        } catch (err) {
            console.error(err)
            const serverErrors = {}
            let genericMsg = err.message || 'Failed to create PO'

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
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Payment Method</label>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="CREDIT"
                                    checked={form.payment_method === 'CREDIT'}
                                    onChange={e => setForm({ ...form, payment_method: e.target.value })}
                                />
                                Credit (Pay Later)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="CASH"
                                    checked={form.payment_method === 'CASH'}
                                    onChange={e => {
                                        setForm({ ...form, payment_method: e.target.value })
                                        if (errors.vendor) setErrors(prev => ({ ...prev, vendor: null }))
                                    }}
                                />
                                Cash (Paid Now)
                            </label>
                        </div>
                    </div>

                    <Select
                        label="Vendor"
                        value={form.vendor}
                        onChange={e => {
                            setForm({ ...form, vendor: e.target.value })
                            if (errors.vendor) setErrors(prev => ({ ...prev, vendor: null }))
                        }}
                        error={errors.vendor}
                        required={form.payment_method === 'CREDIT'}
                    >
                        <option value="">{form.payment_method === 'CASH' ? 'Select Vendor (Optional)' : 'Select Vendor'}</option>
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
