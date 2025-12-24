import React from 'react'
import { render, screen, act } from '@testing-library/react'
import POS from '../POS'

beforeEach(()=>{
  // vitest exposes `vi` as the global test double helper (similar to jest)
  global.fetch = vi.fn(() => Promise.resolve({ ok:true, json: ()=> Promise.resolve([{id:1,name:'Rice',available_portions:['full'],price_full:'60'}]) }))
})

test('renders POS and allows adding to cart', async ()=>{
  await act(async ()=> render(<POS/>))
  expect(screen.getByText(/Point of Sale/)).toBeInTheDocument()
  expect(screen.getByText(/Rice/)).toBeInTheDocument()
})
