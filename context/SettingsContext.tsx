'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Settings {
  id: string
  theme: string
  currency: string
  currencySymbol: string
  vatPercentage: number
  lowStockAlert: boolean
  autoBackup: boolean
  dateFormat: string
  language: string
  receiptFooter: string
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
}

interface SettingsContextType {
  settings: Settings | null
  loading: boolean
  refreshSettings: () => Promise<void>
  formatCurrency: (amount: number) => string
  formatDate: (date: Date | string) => string
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSettings(data)
      
      // Apply theme
      if (data.theme === 'DARK') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    if (!settings) return `$${amount.toFixed(2)}`
    return `${settings.currencySymbol}${amount.toFixed(2)}`
  }

  const formatDate = (date: Date | string): string => {
    if (!settings) return new Date(date).toLocaleDateString()
    
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    
    switch (settings.dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`
      default:
        return `${month}/${day}/${year}`
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      refreshSettings: fetchSettings,
      formatCurrency,
      formatDate
    }}>
      {children}
    </SettingsContext.Provider>
  )
}