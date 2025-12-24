import React from 'react'
import { render, screen } from '@testing-library/react'
import Sidebar from '../Sidebar'
import { AuthContext } from '../../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'

test('shows admin menu', ()=>{
  const user = {username:'a', role:'admin'}
  render(<MemoryRouter><AuthContext.Provider value={{user}}><Sidebar/></AuthContext.Provider></MemoryRouter>)
  expect(screen.getByText(/Dashboard/)).toBeInTheDocument()
  expect(screen.getByText(/User Management/)).toBeInTheDocument()
})

test('shows cashier limited menu', ()=>{
  const user = {username:'c', role:'cashier'}
  render(<MemoryRouter><AuthContext.Provider value={{user}}><Sidebar/></AuthContext.Provider></MemoryRouter>)
  expect(screen.queryByText(/User Management/)).not.toBeInTheDocument()
  expect(screen.getByText(/POS \/ New Order/)).toBeInTheDocument()
})
