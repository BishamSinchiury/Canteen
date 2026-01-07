import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import styles from './POS.module.css'
import './Print.css' // Import global print styles
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
    const [showDebugReceipt, setShowDebugReceipt] = useState(false) // DEBUG MODE

    const toast = useToast()
    const printRef = useRef(null)

    // Manage printing class on body
    useEffect(() => {
        if (receiptPayload) {
            document.body.classList.add('printing-receipt')
        } else {
            document.body.classList.remove('printing-receipt')
        }
        return () => {
            document.body.classList.remove('printing-receipt')
        }
    }, [receiptPayload])

    useEffect(() => {
        loadData()
    }, [])

    // Periodic refresh to keep stock levels up-to-date
    useEffect(() => {
        const interval = setInterval(() => {
            // Silent refresh - don't show loading state
            fetchFoodItems('?is_active=true')
                .then(menuData => {
                    setMenu(Array.isArray(menuData) ? menuData : menuData.results || [])
                })
                .catch(() => {
                    // Silent fail - don't disrupt user experience
                })
        }, 30000) // Refresh every 30 seconds

        return () => clearInterval(interval)
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

    async function addToCart(item, portion) {
        const price = portion === 'full' ? parseFloat(item.price_full) : parseFloat(item.price_half)

        // Check stock availability before adding
        if (item.stock_quantity !== null && item.stock_quantity !== undefined) {
            // Pre-made item: check stock
            const currentInCart = cart
                .filter(c => c.id === item.id && c.portion === portion)
                .reduce((sum, c) => sum + c.quantity, 0)

            if (currentInCart >= item.stock_quantity) {
                toast.error(`Out of stock: ${item.name}`)
                return
            }

            if (item.stock_quantity <= 0) {
                toast.error(`${item.name} is currently out of stock`)
                return
            }
        } else {
            // Made-to-order: Check if has recipe and ingredients available
            // For made-to-order items, we don't block cart addition
            // but the backend will validate during checkout
            // This prevents too many API calls for every cart addition
        }

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
                quantity: 1,
                stock_quantity: item.stock_quantity // Store for validation
            }]
        })
    }

    function updateQuantity(index, delta) {
        setCart(prev => {
            const updated = [...prev]
            const item = updated[index]

            // Check stock before increasing quantity
            if (delta > 0 && item.stock_quantity !== null && item.stock_quantity !== undefined) {
                if (item.quantity >= item.stock_quantity) {
                    toast.error(`Cannot add more: Only ${item.stock_quantity} ${item.name} available`)
                    return prev // Don't update
                }
            }

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

            // Clear cart first
            clearCart()

            // Refresh menu to get updated stock levels
            loadData()

            // Disable debug modal
            // setShowDebugReceipt(true)

            // Trigger automatic print after a small delay to ensure DOM is ready
            setTimeout(() => {
                window.print()
            }, 500)

        } catch (err) {
            toast.error(err.message || 'Transaction failed')
        } finally {
            setCheckingOut(false)
        }
    }

    function handleTestPrint() {
        const dummyPayload = {
            institution: { name: 'Test Institution', address: '123 Test St' },
            transaction_id: 'TEST-' + Math.floor(Math.random() * 1000),
            date: new Date().toISOString(),
            payment: { type: 'CASH' },
            items: [
                { name: 'Test Item 1', portion: 'Full', quantity: 1, line_total: 100.00 },
                { name: 'Test Item 2', portion: 'Half', quantity: 2, line_total: 150.00 }
            ],
            cash_paid: 250.00
        }
        setReceiptPayload(dummyPayload)
        // setShowDebugReceipt(true) // Disabled
        toast.info('Test receipt loaded - Printing...')

        setTimeout(() => {
            window.print()
        }, 500)
    }

    // Native print handler - relies on robust CSS @media print
    function handlePrint() {
        if (!receiptPayload) {
            toast.error('No receipt to print')
            return
        }
        window.print()
    }

    // PDF Export handler using jsPDF + html2canvas
    async function handlePrintPDF() {
        if (!printRef.current || !receiptPayload) {
            toast.error('No receipt to print')
            return
        }

        try {
            toast.info('Generating PDF...')

            // Capture the receipt as canvas
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            // Create PDF (80mm width = ~227 pixels at 72 DPI, converted to mm)
            const imgWidth = 80 // mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, imgHeight + 10] // Dynamic height
            })

            const imgData = canvas.toDataURL('image/png')
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

            // Save PDF
            pdf.save(`Receipt-${receiptPayload.transaction_id}.pdf`)
            toast.success('PDF exported successfully!')

            console.log('PDF Generated:', {
                width: imgWidth,
                height: imgHeight,
                transaction: receiptPayload.transaction_id
            })
        } catch (err) {
            console.error('PDF Generation Error:', err)
            toast.error('Failed to generate PDF: ' + err.message)
        }
    }

    // Direct browser print (fallback)
    function handleDirectPrint() {
        if (!receiptPayload) {
            toast.error('No receipt to print')
            return
        }

        console.log('Triggering browser print...')
        setTimeout(() => {
            window.print()
        }, 500)
    }

    // Remove automatic print effect - make it manual for verification
    // useEffect(() => {
    //     if (receiptPayload && receiptPayload.items && receiptPayload.items.length > 0) {
    //         const timer = setTimeout(() => {
    //             window.print()
    //         }, 1000)
    //         return () => clearTimeout(timer)
    //     }
    // }, [receiptPayload])

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
                                        {/* Stock Indicator */}
                                        {item.stock_quantity !== null && item.stock_quantity !== undefined && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: item.stock_quantity > 5 ? '#10B981' : item.stock_quantity > 0 ? '#F59E0B' : '#EF4444',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                display: 'inline-block',
                                                marginTop: '4px'
                                            }}>
                                                {item.stock_quantity > 0 ? `${item.stock_quantity} left` : 'Out of Stock'}
                                            </div>
                                        )}
                                        {(item.stock_quantity === null || item.stock_quantity === undefined) && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: '#6366F1',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                display: 'inline-block',
                                                marginTop: '4px'
                                            }}>
                                                Made to Order
                                            </div>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className={styles.menuItemDesc}>{item.description}</p>
                                    )}
                                    <div className={styles.portionBtns}>
                                        {item.available_portions?.includes('full') && (
                                            <button
                                                className={styles.portionBtn}
                                                onClick={() => addToCart(item, 'full')}
                                                disabled={item.stock_quantity !== null && item.stock_quantity <= 0}
                                                style={{
                                                    opacity: item.stock_quantity !== null && item.stock_quantity <= 0 ? 0.5 : 1,
                                                    cursor: item.stock_quantity !== null && item.stock_quantity <= 0 ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <span className={styles.portionLabel}>Full</span>
                                                <span className={styles.portionPrice}>{formatPrice(parseFloat(item.price_full))}</span>
                                            </button>
                                        )}
                                        {item.available_portions?.includes('half') && (
                                            <button
                                                className={styles.portionBtn}
                                                onClick={() => addToCart(item, 'half')}
                                                disabled={item.stock_quantity !== null && item.stock_quantity <= 0}
                                                style={{
                                                    opacity: item.stock_quantity !== null && item.stock_quantity <= 0 ? 0.5 : 1,
                                                    cursor: item.stock_quantity !== null && item.stock_quantity <= 0 ? 'not-allowed' : 'pointer'
                                                }}
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className={styles.clearCartBtn}
                                onClick={handleTestPrint}
                                title="Test Printer with dummy receipt"
                                style={{ color: 'var(--primary-600)' }}
                            >
                                🖨️ Test
                            </button>
                            {cart.length > 0 && (
                                <button className={styles.clearCartBtn} onClick={clearCart}>
                                    Clear All
                                </button>
                            )}
                        </div>
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

            {/* Receipt Portal - Renders directly into body to bypass Layout constraints */}
            {receiptPayload && createPortal(
                <div className="print-portal-root">
                    <ReceiptPrint payload={receiptPayload} ref={printRef} />
                </div>,
                document.body
            )}

            {/* Optional: Debug Receipt Viewer (for testing only) */}

        </>
    )
}
