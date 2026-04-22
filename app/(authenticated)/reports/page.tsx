'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
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

// Custom tooltip content component to avoid type issues
const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-700 rounded shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function ReportsPage() {
  const { formatCurrency, vatPercentage } = useCurrency()
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Profit & Loss Reports</h1>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(report.summary.totalSales)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(report.summary.totalPurchases)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">Gross Profit</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(report.summary.grossProfit)}</p>
              <p className="text-sm text-gray-500">Margin: {report.summary.grossProfitMargin.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(report.summary.netProfit)}</p>
              <p className="text-sm text-gray-500">Margin: {report.summary.netProfitMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Daily Breakdown Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Daily Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888888" />
                <YAxis stroke="#888888" />
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                <Legend />
                <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
                <Bar dataKey="purchases" fill="#EF4444" name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Trend Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={report.dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888888" />
                <YAxis stroke="#888888" />
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" name="Sales" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Top Selling Products</h3>
            <div className="space-y-3">
              {report.topProducts.length > 0 ? (
                report.topProducts.map((product, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                    <div>
                      <p className="font-medium dark:text-white">{product.product.name}</p>
                      <p className="text-sm text-gray-500">Quantity Sold: {product.quantity}</p>
                    </div>
                    <p className="font-semibold dark:text-white">{formatCurrency(product.revenue)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No product sales data available</p>
              )}
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Summary Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-b dark:border-gray-700 pb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
                <p className="text-xl font-semibold dark:text-white">{report.salesCount} Sales</p>
                <p className="text-xl font-semibold dark:text-white">{report.purchaseCount} Purchases</p>
              </div>
              <div className="border-b dark:border-gray-700 pb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                <p className="text-sm dark:text-white">
                  {new Date(report.period.startDate).toLocaleDateString()} - {new Date(report.period.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Report Generated</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select a date range and click "Generate Report" to view profit and loss analysis
          </p>
        </div>
      )}
    </div>
  )
}