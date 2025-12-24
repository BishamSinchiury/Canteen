import React, { useEffect, useState } from 'react'
import { getReceipt } from '../api'
import ReceiptPrint from './ReceiptPrint'

export default function TransactionDetail({txId}){
  const [receipt, setReceipt] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(()=>{
    getReceipt(txId).then(r=> setReceipt(r)).catch(e=> setErr(e.message || 'Not found'))
  }, [txId])

  return (
    <div>
      <h3>Transaction {txId}</h3>
      {err && <div style={{color:'crimson'}}>{err}</div>}
      {receipt && (
        <div>
          <button onClick={()=>window.print()}>Re-print</button>
          <div style={{position:'absolute', left:-10000}}>
            <ReceiptPrint payload={receipt.payload} />
          </div>
        </div>
      )}
    </div>
  )
}
