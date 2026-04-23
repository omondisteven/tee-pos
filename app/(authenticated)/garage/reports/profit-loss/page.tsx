'use client'

import { useState } from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import toast from 'react-hot-toast'

export default function GarageProfitLossPage() {
  const { formatCurrency } = useCurrency()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both dates')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setReport(data)
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Garage Profit & Loss</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {report && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Report Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span>Total Revenue</span>
              <span className="font-semibold">{formatCurrency(report.totalRevenue || 0)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Total Expenses (placeholder)</span>
              <span className="font-semibold">{formatCurrency(0)}</span>
            </div>
            <div className="flex justify-between py-2 text-lg font-bold">
              <span>Net Profit</span>
              <span className="text-green-600">{formatCurrency(report.totalRevenue || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}