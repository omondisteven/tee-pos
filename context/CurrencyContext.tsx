'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CurrencyContextType {
  currency: string
  currencySymbol: string
  vatPercentage: number
  decimalPlaces: number
  loading: boolean
  formatCurrency: (amount: number) => string
  formatInputValue: (value: string) => string
  parseInputValue: (value: string) => number
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
  const [decimalPlaces, setDecimalPlaces] = useState(2)
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
        setDecimalPlaces(data.decimalPlaces || 2)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    const decimals = decimalPlaces
    if (currency === 'KES') {
      return `${currencySymbol} ${amount.toLocaleString('en-KE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}`
    }
    return `${currencySymbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`
  }

  // Format input value to ensure correct decimal places
  const formatInputValue = (value: string): string => {
    if (!value) return ''
    // Remove any non-digit characters except decimal point
    let cleanValue = value.replace(/[^\d.-]/g, '')
    const parts = cleanValue.split('.')
    if (parts.length === 1) {
      // No decimal point, add .00
      return `${parts[0]}.${'0'.repeat(decimalPlaces)}`
    } else if (parts.length === 2) {
      // Has decimal point, pad or truncate to decimalPlaces
      const decimalPart = parts[1].padEnd(decimalPlaces, '0').slice(0, decimalPlaces)
      return `${parts[0]}.${decimalPart}`
    }
    return cleanValue
  }

  // Parse input value to number
  const parseInputValue = (value: string): number => {
    if (!value) return 0
    const cleanValue = value.replace(/[^\d.-]/g, '')
    return parseFloat(parseFloat(cleanValue).toFixed(decimalPlaces)) || 0
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <CurrencyContext.Provider value={{
      currency,
      currencySymbol,
      vatPercentage,
      decimalPlaces,
      loading,
      formatCurrency,
      formatInputValue,
      parseInputValue,
      refreshSettings: fetchSettings
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}