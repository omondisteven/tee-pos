'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ReportData {
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalSales: number
    totalPurchases: number
    cogs: number
    grossProfit: number
    netProfit: number
    grossProfitMargin: number
    netProfitMargin: number
  }
  salesCount: number
  purchaseCount: number
  topProducts: Array<{
    product: { name: string }
    quantity: number
    revenue: number
  }>
  dailyBreakdown: Array<{
    date: string
    sales: number
    purchases: number
  }>
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error('Failed to generate report')
      }

      const data = await res.json()
      setReport(data)
      toast.success('Report generated successfully')
    } catch (error) {
      console.error('Report error:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profit & Loss Reports</h1>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">${report.summary.totalSales.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-red-600">${report.summary.totalPurchases.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Gross Profit</p>
              <p className="text-2xl font-bold text-blue-600">${report.summary.grossProfit.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Margin: {report.summary.grossProfitMargin.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Net Profit</p>
              <p className="text-2xl font-bold text-purple-600">${report.summary.netProfit.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Margin: {report.summary.netProfitMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Daily Breakdown Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#3B82F6" name="Sales ($)" />
                <Bar dataKey="purchases" fill="#EF4444" name="Purchases ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
            <div className="space-y-3">
              {report.topProducts.map((product, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{product.product.name}</p>
                    <p className="text-sm text-gray-500">Quantity: {product.quantity}</p>
                  </div>
                  <p className="font-semibold">${product.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}