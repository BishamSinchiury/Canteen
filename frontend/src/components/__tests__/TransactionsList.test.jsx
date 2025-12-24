import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import TransactionsList from '../TransactionsList'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../api'

test('renders transactions list', async ()=>{
  vi.spyOn(api, 'fetchTransactions').mockResolvedValue([{id:10,payment_type:'cash',total_amount:50}])
  render(<MemoryRouter><TransactionsList /></MemoryRouter>)
  await waitFor(()=> expect(screen.getByText(/#10/)).toBeInTheDocument())
})
