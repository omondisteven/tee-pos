'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CurrencyContextType {
  currency: string
  currencySymbol: string
  vatPercentage: number
  loading: boolean
  formatCurrency: (amount: number) => string
  refreshSettings: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState('KES')
  const [currencySymbol, setCurrencySymbol] = useState('KSh')
  const [vatPercentage, setVatPercentage] = useState(16)
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCurrency(data.currency || 'KES')
        setCurrencySymbol(data.currencySymbol || 'KSh')
        setVatPercentage(data.vatPercentage || 16)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    if (currency === 'KES') {
      // Kenyan Shilling format - no decimal places for whole numbers
      return `${currencySymbol} ${amount.toLocaleString('en-KE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}`
    }
    // Default format for other currencies
    return `${currencySymbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <CurrencyContext.Provider value={{
      currency,
      currencySymbol,
      vatPercentage,
      loading,
      formatCurrency,
      refreshSettings: fetchSettings
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}