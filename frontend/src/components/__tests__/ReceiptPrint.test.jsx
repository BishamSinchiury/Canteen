import React from 'react'
import { render, screen } from '@testing-library/react'
import ReceiptPrint from '../ReceiptPrint'

test('renders receipt content', () => {
  const payload = {
    institution:{name:'EECOHM School of Excellence', address:'Birtamode 1, Jhapa'},
    transaction_id: 1,
    date: new Date().toISOString(),
    cashier:{username:'c1', full_name:'Cashier One'},
    items: [{name:'Rice', portion:'full', quantity:1, line_total:60}],
    payment:{total_amount:60, type:'cash'}
  }
  render(<ReceiptPrint payload={payload} />)
  expect(screen.getByText(/EECOHM School of Excellence/)).toBeInTheDocument()
  expect(screen.getByText(/Rice/)).toBeInTheDocument()
})
