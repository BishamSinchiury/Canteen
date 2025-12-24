import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import TransactionDetail from '../TransactionDetail'
import * as api from '../../api'

test('fetches and displays receipt, allows re-print', async ()=>{
  const payload = { institution:{name:'EECOHM'}, transaction_id: 5, cashier:{username:'c1', full_name:'Cashier One'}, items:[], payment:{total_amount:20} }
  vi.spyOn(api, 'getReceipt').mockResolvedValue({payload})
  render(<TransactionDetail txId={5} />)
  expect(screen.getByText(/Transaction 5/)).toBeInTheDocument()
  await waitFor(()=> expect(screen.getByText(/Re-print/)).toBeInTheDocument())
})
