import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Button from './Button'

describe('Button Component', () => {
    it('renders children correctly', () => {
        render(<Button>Click Me</Button>)
        expect(screen.getByText('Click Me')).toBeDefined()
    })

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn()
        render(<Button onClick={handleClick}>Click Me</Button>)
        fireEvent.click(screen.getByText('Click Me'))
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('is disabled when disabled prop is passed', () => {
        render(<Button disabled>Disabled</Button>)
        const btn = screen.getByText('Disabled')
        expect(btn.disabled).toBe(true)
    })
})
