'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { refreshSettings: refreshCurrencySettings } = useCurrency()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        toast.success('Settings saved successfully')
        // Apply theme immediately
        applyTheme(settings.theme)
        await refreshCurrencySettings() // Refresh currency context
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const applyTheme = (theme: string) => {
    if (theme === 'DARK') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-xl">Loading settings...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-xl text-red-500">Failed to load settings</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your system preferences and configurations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-2 px-1 ${
              activeTab === 'general'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`pb-2 px-1 ${
              activeTab === 'company'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Company Info
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`pb-2 px-1 ${
              activeTab === 'receipt'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Receipt Settings
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2 px-1 ${
              activeTab === 'notifications'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Notifications
          </button>
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Appearance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LIGHT">Light Mode</option>
                  <option value="DARK">Dark Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EN">English</option>
                  <option value="FR">French</option>
                  <option value="ES">Spanish</option>
                  <option value="DE">German</option>
                  <option value="ZH">Chinese</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Currency & Tax</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                {/* Update the currency select options to include African currencies */}
                <select
                value={settings.currency}
                onChange={(e) => {
                    const currencySymbols: { [key: string]: string } = {
                    USD: '$',
                    EUR: '€',
                    GBP: '£',
                    JPY: '¥',
                    CNY: '¥',
                    INR: '₹',
                    AUD: 'A$',
                    CAD: 'C$',
                    CHF: 'Fr',
                    NZD: 'NZ$',
                    // African Currencies
                    KES: 'KSh',
                    NGN: '₦',
                    ZAR: 'R',
                    GHS: '₵',
                    TZS: 'TSh',
                    UGX: 'USh',
                    RWF: 'FRw',
                    XAF: 'FCFA',
                    XOF: 'CFA',
                    MAD: 'DH',
                    EGP: 'E£',
                    ETB: 'Br',
                    MUR: '₨',
                    BWP: 'P',
                    ZMW: 'ZK',
                    MZN: 'MT',
                    GNF: 'FG'
                    }
                    setSettings({ 
                    ...settings, 
                    currency: e.target.value,
                    currencySymbol: currencySymbols[e.target.value] || '$'
                    })
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                <optgroup label="Major Currencies">
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">British Pound (£)</option>
                    <option value="JPY">Japanese Yen (¥)</option>
                    <option value="CNY">Chinese Yuan (¥)</option>
                    <option value="INR">Indian Rupee (₹)</option>
                </optgroup>
                <optgroup label="African Currencies">
                    <option value="KES">Kenyan Shilling (KSh)</option>
                    <option value="NGN">Nigerian Naira (₦)</option>
                    <option value="ZAR">South African Rand (R)</option>
                    <option value="GHS">Ghanaian Cedi (₵)</option>
                    <option value="TZS">Tanzanian Shilling (TSh)</option>
                    <option value="UGX">Ugandan Shilling (USh)</option>
                    <option value="RWF">Rwandan Franc (FRw)</option>
                    <option value="XAF">Central African CFA Franc (FCFA)</option>
                    <option value="XOF">West African CFA Franc (CFA)</option>
                    <option value="MAD">Moroccan Dirham (DH)</option>
                    <option value="EGP">Egyptian Pound (E£)</option>
                    <option value="ETB">Ethiopian Birr (Br)</option>
                    <option value="MUR">Mauritian Rupee (₨)</option>
                    <option value="BWP">Botswana Pula (P)</option>
                    <option value="ZMW">Zambian Kwacha (ZK)</option>
                    <option value="MZN">Mozambican Metical (MT)</option>
                    <option value="GNF">Guinean Franc (FG)</option>
                </optgroup>
                <optgroup label="Other Currencies">
                    <option value="AUD">Australian Dollar (A$)</option>
                    <option value="CAD">Canadian Dollar (C$)</option>
                    <option value="CHF">Swiss Franc (Fr)</option>
                    <option value="NZD">New Zealand Dollar (NZ$)</option>
                </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="$"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VAT Percentage (%)</label>
                <input
                  type="number"
                  value={settings.vatPercentage}
                  onChange={(e) => setSettings({ ...settings, vatPercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">Default VAT rate for taxable items</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Info Settings */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Email</label>
              <input
                type="email"
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Phone</label>
              <input
                type="text"
                value={settings.companyPhone}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
              <textarea
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* Receipt Settings */}
      {activeTab === 'receipt' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Receipt Customization</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Footer Message</label>
            <textarea
              value={settings.receiptFooter}
              onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Thank you for your business!"
            />
            <p className="text-xs text-gray-500 mt-1">This message will appear at the bottom of all receipts</p>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div>
                <span className="font-medium text-gray-700">Low Stock Alerts</span>
                <p className="text-sm text-gray-500">Receive notifications when products are running low</p>
              </div>
              <input
                type="checkbox"
                checked={settings.lowStockAlert}
                onChange={(e) => setSettings({ ...settings, lowStockAlert: e.target.checked })}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div>
                <span className="font-medium text-gray-700">Auto Backup</span>
                <p className="text-sm text-gray-500">Automatically backup data daily</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Preview Section */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-md font-semibold mb-3">Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Currency Format:</strong> {settings.currencySymbol}1,234.56</p>
            <p><strong>VAT Rate:</strong> {settings.vatPercentage}%</p>
            <p><strong>Date Format Example:</strong> {
              settings.dateFormat === 'MM/DD/YYYY' ? '12/31/2024' :
              settings.dateFormat === 'DD/MM/YYYY' ? '31/12/2024' :
              '2024-12-31'
            }</p>
          </div>
          <div>
            <p><strong>Theme:</strong> {settings.theme === 'LIGHT' ? '☀️ Light Mode' : '🌙 Dark Mode'}</p>
            <p><strong>Language:</strong> {settings.language}</p>
            <p><strong>Company:</strong> {settings.companyName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}