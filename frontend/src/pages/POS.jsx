import React, { useState, useEffect, useRef } from 'react'
import styles from './POS.module.css'
import Input from '../components/ui/Input'
import { Loader, useToast } from '../components/ui/Badge'
import { fetchFoodItems, createTransaction, getReceipt, fetchAccounts, fetchCategories } from '../api'
import ReceiptPrint from '../components/ReceiptPrint'

export default function POS() {
    const [menu, setMenu] = useState([])
    const [categories, setCategories] = useState([])
    const [accounts, setAccounts] = useState([])
    const [cart, setCart] = useState([])
    const [loading, setLoading] = useState(true)
    const [checkingOut, setCheckingOut] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [paymentType, setPaymentType] = useState('cash')
    const [selectedAccount, setSelectedAccount] = useState('')
    const [receiptPayload, setReceiptPayload] = useState(null)
    const [printCashAmount, setPrintCashAmount] = useState('')

    const toast = useToast()
    const printRef = useRef(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [menuData, catData, accountData] = await Promise.all([
                fetchFoodItems('?is_active=true'),
                fetchCategories().catch(() => []),
                fetchAccounts().catch(() => ({ results: [] }))
            ])
            setMenu(Array.isArray(menuData) ? menuData : menuData.results || [])
            setCategories(catData || [])
            setAccounts(accountData.results || accountData || [])
        } catch (err) {
            console.error('Load error:', err)
            toast.error('Failed to load menu data')
        } finally {
            setLoading(false)
        }
    }

    function addToCart(item, portion) {
        const price = portion === 'full' ? parseFloat(item.price_full) : parseFloat(item.price_half)

        setCart(prev => {
            const existingIdx = prev.findIndex(c => c.id === item.id && c.portion === portion)
            if (existingIdx >= 0) {
                const updated = [...prev]
                updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 }
                return updated
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                portion,
                unitPrice: price,
                quantity: 1
            }]
        })
    }

    function updateQuantity(index, delta) {
        setCart(prev => {
            const updated = [...prev]
            updated[index].quantity += delta
            if (updated[index].quantity <= 0) {
                return updated.filter((_, i) => i !== index)
            }
            return updated
        })
    }

    function removeItem(index) {
        setCart(prev => prev.filter((_, i) => i !== index))
    }

    function clearCart() {
        setCart([])
        setPaymentType('cash')
        setSelectedAccount('')
        setPrintCashAmount('')
    }

    async function handleCheckout() {
        if (cart.length === 0) return

        if ((paymentType === 'credit' || paymentType === 'mixed') && !selectedAccount) {
            toast.warning('Please select an account for credit/mixed payment')
            return
        }

        if (paymentType === 'mixed') {
            if (!printCashAmount || parseFloat(printCashAmount) <= 0) {
                toast.warning('Please enter the cash amount paid')
                return
            }
            if (parseFloat(printCashAmount) >= cartTotal) {
                toast.warning('Cash amount must be less than total for mixed payment (use Cash option instead)')
                return
            }
        }

        setCheckingOut(true)

        const lines = cart.map(c => ({
            food_item: c.id,
            portion_type: c.portion,
            unit_price: c.unitPrice.toFixed(2),
            quantity: c.quantity
        }))

        try {
            const payload = {
                payment_type: paymentType,
                lines,
                linked_account: (paymentType === 'credit' || paymentType === 'mixed') ? selectedAccount : null
            }

            if (paymentType === 'mixed') {
                payload.cash_amount = parseFloat(printCashAmount)
            }

            const tx = await createTransaction(payload)

            // Get receipt and trigger print
            const receipt = await getReceipt(tx.id)


            // Enrich payload with local data for printing
            let finalPayload = { ...receipt.payload }

            if ((paymentType === 'credit' || paymentType === 'mixed') && selectedAccount) {
                const account = accounts.find(a => a.account_id == selectedAccount)
                if (account) {
                    finalPayload.account_name = account.name
                }
            }

            if (paymentType === 'mixed' && printCashAmount) {
                finalPayload.cash_paid = printCashAmount
            }

            setReceiptPayload(finalPayload)

            // Debug: Log payload to verify data
            console.log('Receipt Payload:', finalPayload)

            toast.success(`Transaction #${tx.id} completed successfully!`)

            // Trigger print immediately
            // Note: For truly silent printing to a thermal printer, configure the default printer in Windows
            // and use browser flags: --kiosk-printing or use a dedicated thermal printer library
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    window.print()
                })
            })

            clearCart()
        } catch (err) {
            toast.error(err.message || 'Transaction failed')
        } finally {
            setCheckingOut(false)
        }
    }

    const filteredMenu = menu.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0)
    const formatPrice = (price) => `Rs. ${price.toFixed(2)}`

    if (loading) {
        return <Loader center size="lg" />
    }

    return (
        <>
            <div className={styles.posPage}>
                {/* Menu Section */}
                <div className={styles.menuSection}>
                    <div className={styles.menuHeader}>
                        <div className={styles.searchInput}>
                            <Input
                                placeholder="Search menu items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={<span>🔍</span>}
                            />
                        </div>
                        <div className={styles.categoryFilter}>
                            <button
                                className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.categoryBtnActive : ''}`}
                                onClick={() => setSelectedCategory('all')}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.categoryBtnActive : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.menuGrid}>
                        {filteredMenu.map(item => (
                            <div key={item.id} className={styles.menuItem}>
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className={styles.menuItemImage} />
                                ) : (
                                    <div className={styles.menuItemImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                        🍽️
                                    </div>
                                )}
                                <div className={styles.menuItemContent}>
                                    <div className={styles.menuItemHeader}>
                                        <div className={styles.menuItemCategory}>{item.category || 'General'}</div>
                                        <h4 className={styles.menuItemName}>{item.name}</h4>
                                    </div>
                                    {item.description && (
                                        <p className={styles.menuItemDesc}>{item.description}</p>
                                    )}
                                    <div className={styles.portionBtns}>
                                        {item.available_portions?.includes('full') && (
                                            <button
                                                className={styles.portionBtn}
                                                onClick={() => addToCart(item, 'full')}
                                            >
                                                <span className={styles.portionLabel}>Full</span>
                                                <span className={styles.portionPrice}>{formatPrice(parseFloat(item.price_full))}</span>
                                            </button>
                                        )}
                                        {item.available_portions?.includes('half') && (
                                            <button
                                                className={styles.portionBtn}
                                                onClick={() => addToCart(item, 'half')}
                                            >
                                                <span className={styles.portionLabel}>Half</span>
                                                <span className={styles.portionPrice}>{formatPrice(parseFloat(item.price_half))}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cart Section */}
                <div className={styles.cartSection}>
                    <div className={styles.cartHeader}>
                        <h3 className={styles.cartTitle}>
                            🛒 Cart
                            {cart.length > 0 && (
                                <span className={styles.cartCount}>{cart.reduce((s, c) => s + c.quantity, 0)}</span>
                            )}
                        </h3>
                        {cart.length > 0 && (
                            <button className={styles.clearCartBtn} onClick={clearCart}>
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className={styles.cartItems}>
                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <div className={styles.emptyCartIcon}>🛒</div>
                                <p>Your cart is empty</p>
                                <p style={{ fontSize: 'var(--font-size-sm)' }}>Add items from the menu</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className={styles.cartItem}>
                                    <div className={styles.cartItemInfo}>
                                        <h5 className={styles.cartItemName}>{item.name}</h5>
                                        <span className={styles.cartItemPortion}>
                                            {item.portion} • {formatPrice(item.unitPrice)}
                                        </span>
                                    </div>
                                    <div className={styles.cartItemQty}>
                                        <button className={styles.qtyBtn} onClick={() => updateQuantity(idx, -1)}>−</button>
                                        <span className={styles.qtyValue}>{item.quantity}</span>
                                        <button className={styles.qtyBtn} onClick={() => updateQuantity(idx, 1)}>+</button>
                                    </div>
                                    <div className={styles.cartItemPrice}>
                                        {formatPrice(item.unitPrice * item.quantity)}
                                    </div>
                                    <button className={styles.removeBtn} onClick={() => removeItem(idx)}>×</button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.cartFooter}>
                        <div className={styles.cartTotal}>
                            <span className={styles.totalLabel}>Total</span>
                            <span className={styles.totalAmount}>{formatPrice(cartTotal)}</span>
                        </div>

                        <div className={styles.paymentType}>
                            <div className={styles.paymentLabel}>Payment Method</div>
                            <div className={styles.paymentBtns}>
                                <button
                                    className={`${styles.paymentBtn} ${paymentType === 'cash' ? styles.paymentBtnActive : ''}`}
                                    onClick={() => { setPaymentType('cash'); setSelectedAccount(''); setPrintCashAmount('') }}
                                >
                                    💵 Cash
                                </button>
                                <button
                                    className={`${styles.paymentBtn} ${paymentType === 'credit' ? styles.paymentBtnActive : ''}`}
                                    onClick={() => { setPaymentType('credit'); setPrintCashAmount('') }}
                                >
                                    📋 Credit
                                </button>
                                <button
                                    className={`${styles.paymentBtn} ${paymentType === 'mixed' ? styles.paymentBtnActive : ''}`}
                                    onClick={() => setPaymentType('mixed')}
                                >
                                    🔄 Mixed
                                </button>
                            </div>
                        </div>

                        {paymentType === 'mixed' && (
                            <div style={{ marginTop: 'var(--spacing-3)' }}>
                                <Input
                                    label="Cash Amount Paid"
                                    type="number"
                                    step="0.01"
                                    value={printCashAmount}
                                    onChange={(e) => setPrintCashAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-2)' }}>
                                    Remaining Credit: Rs. {Math.max(0, cartTotal - (parseFloat(printCashAmount) || 0)).toFixed(2)}
                                </div>
                            </div>
                        )}

                        {paymentType !== 'cash' && (
                            <div className={styles.accountSelect} style={{ marginTop: 'var(--spacing-3)' }}>
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-2) var(--spacing-3)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-gray-300)'
                                    }}
                                >
                                    <option value="">Select Account...</option>
                                    <optgroup label="Students">
                                        {accounts.filter(a => a.account_type === 'student').map(a => (
                                            <option key={a.account_id} value={a.account_id}>
                                                {a.name} ({a.account_id}) - Balance: Rs. {a.balance}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Teachers">
                                        {accounts.filter(a => a.account_type === 'teacher').map(a => (
                                            <option key={a.account_id} value={a.account_id}>
                                                {a.name} ({a.account_id}) - Balance: Rs. {a.balance}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        )}

                        <button
                            className={styles.checkoutBtn}
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || checkingOut || ((paymentType === 'credit' || paymentType === 'mixed') && !selectedAccount)}
                        >
                            {checkingOut ? (
                                <>Processing...</>
                            ) : (
                                <>Complete Sale • {formatPrice(cartTotal)}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Receipt for Printing */}
            <div className={styles.printOnlyWrapper}>
                <ReceiptPrint payload={receiptPayload} ref={printRef} />
            </div>
        </>
    )
}
