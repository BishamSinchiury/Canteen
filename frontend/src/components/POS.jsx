import React, { useEffect, useState, useRef } from 'react'
import { fetchFoodItems, createTransaction, getReceipt } from '../api'
import styles from './POS.module.css'
import ReceiptPrint from './ReceiptPrint'

export default function POS(){
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)
  const [receiptPayload, setReceiptPayload] = useState(null)
  const printRef = useRef(null)

  useEffect(()=>{
    fetchFoodItems().then(data=>setMenu(data)).catch(()=>setMenu([]))
  }, [])

  function addToCart(item, portion='full'){
    const unit_price = portion === 'full' ? parseFloat(item.price_full) : parseFloat(item.price_half)
    setCart(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(c=>c.id===item.id && c.portion===portion)
      if(idx>=0){ copy[idx].quantity += 1 }
      else copy.push({id:item.id, name:item.name, portion, unit_price, quantity:1})
      return copy
    })
  }

  function removeItem(index){ setCart(prev=> prev.filter((_,i)=>i!==index)) }

  async function checkout(paymentType='cash', linkedAccount=null){
    setLoading(true)
    const lines = cart.map(c=>({food_item:c.id, portion_type:c.portion, unit_price: c.unit_price.toFixed(2), quantity: c.quantity}))
    try{
      const tx = await createTransaction({payment_type:paymentType, lines, linked_account: linkedAccount})
      // fetch receipt and print
      const receipt = await getReceipt(tx.id)
      setReceiptPayload(receipt.payload)
      setTimeout(()=>{ window.print() }, 300)
      setCart([])
    }catch(err){
      alert(err.message || 'Failed')
    }finally{ setLoading(false) }
  }

  const total = cart.reduce((s,c)=> s + c.unit_price*c.quantity, 0)

  return (
    <div className={styles.pos}>
      <main style={{flex:'1'}}>
        <h2>Point of Sale</h2>
        <div className={styles.menu}>
          {menu.map(it=> (
            <div className={styles.card} key={it.id}>
              <div><strong>{it.name}</strong></div>
              <div className={styles.small}>{it.description}</div>
              <div style={{marginTop:8}}>
                {it.available_portions.includes('full') && <button className={styles.btn} onClick={()=>addToCart(it,'full')}>Full {it.price_full}</button>}
                {it.available_portions.includes('half') && <button className={styles.btn} onClick={()=>addToCart(it,'half')} style={{marginLeft:8}}>Half {it.price_half}</button>}
              </div>
            </div>
          ))}
        </div>
      </main>

      <aside className={styles.cart}>
        <h3>Cart</h3>
        {cart.map((c,i)=> (
          <div key={i} className={styles.cartItem}>
            <div>{c.name} ({c.portion}) x{c.quantity}</div>
            <div>
              { (c.unit_price*c.quantity).toFixed(2) }
              <button onClick={()=>removeItem(i)} style={{marginLeft:8}}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{marginTop:8}}>Total: {total.toFixed(2)}</div>
        <div style={{marginTop:8}}>
          <button className={styles.btn} onClick={()=>checkout('cash')} disabled={!cart.length || loading}>Pay Cash</button>
          <button className={styles.btn} onClick={()=>checkout('credit', 'S001')} disabled={!cart.length || loading} style={{marginLeft:8}}>Charge Student</button>
        </div>
      </aside>

      <div style={{position:'absolute', left:-10000, top:0}}>
        <ReceiptPrint payload={receiptPayload} ref={printRef} />
      </div>
    </div>
  )
}
