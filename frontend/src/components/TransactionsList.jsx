import React, { useEffect, useState } from 'react'
import { fetchTransactions } from '../api'
import { Link } from 'react-router-dom'
import styles from './TransactionsList.module.css'

export default function TransactionsList(){
  const [txs, setTxs] = useState([])
  const [err, setErr] = useState(null)

  useEffect(()=>{
    fetchTransactions().then(data=> setTxs(data)).catch(e=> setErr(e.message || 'Failed'))
  }, [])

  return (
    <div className={styles.list}>
      <h3>Recent Transactions</h3>
      {err && <div style={{color:'crimson'}}>{err}</div>}
      {txs.length===0 && <div className={styles.item}>No transactions</div>}
      {txs.map(t=> (
        <div key={t.id} className={styles.item}>
          <div>#{t.id} <span className={styles.muted}>({t.payment_type})</span></div>
          <div>{t.total_amount} <Link to={`/transactions/${t.id}`}>Re-print</Link></div>
        </div>
      ))}
    </div>
  )
}
