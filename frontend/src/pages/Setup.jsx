import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Setup.module.css'
import Input from '../components/ui/Input'
import { useToast } from '../components/ui/Badge'
import { getSetupStatus, completeSetup } from '../api'

export default function Setup() {
    const navigate = useNavigate()
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        org_name: 'EECOHM School of Excellence',
        org_address: '',
        org_phone: '',
        org_email: '',
        admin_username: '',
        admin_password: '',
        admin_email: ''
    })

    useEffect(() => {
        checkSetupStatus()
    }, [])

    async function checkSetupStatus() {
        try {
            const data = await getSetupStatus()
            if (data && data.is_setup) {
                navigate('/login')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const data = await completeSetup(formData)
            if (data && data.status === 'Setup complete') {
                toast.success('System setup successfully!')
                navigate('/login')
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Setup failed')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className={styles.loading}>Checking system status...</div>

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>System Setup</h1>
                <p className={styles.subtitle}>Welcome to Canteen Management System</p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.step}>
                        <h3 className={styles.stepTitle}>Step 1: Organization Details</h3>
                        <Input
                            label="Organization Name"
                            value={formData.org_name}
                            onChange={e => setFormData({ ...formData, org_name: e.target.value })}
                            required
                        />
                        <Input
                            label="Address"
                            value={formData.org_address}
                            onChange={e => setFormData({ ...formData, org_address: e.target.value })}
                            required
                        />
                        <Input
                            label="Phone"
                            value={formData.org_phone}
                            onChange={e => setFormData({ ...formData, org_phone: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={formData.org_email}
                            onChange={e => setFormData({ ...formData, org_email: e.target.value })}
                        />
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.step}>
                        <h3 className={styles.stepTitle}>Step 2: Admin Account</h3>
                        <Input
                            label="Admin Username"
                            value={formData.admin_username}
                            onChange={e => setFormData({ ...formData, admin_username: e.target.value })}
                            required
                        />
                        <Input
                            label="Admin Password"
                            type="password"
                            value={formData.admin_password}
                            onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                            required
                        />
                        <Input
                            label="Admin Email"
                            type="email"
                            value={formData.admin_email}
                            onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? 'Setting up...' : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    )
}
