'use client'

import { useEffect, useState } from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface DashboardData {
  totalProducts: number
  lowStockProducts: number
  totalSales: number
  totalPurchases: number
  recentSales: any[]
  recentPurchases: any[]
  salesTrend: Array<{ date: string; sales: number }>
}

export default function DashboardPage() {
  const { formatCurrency } = useCurrency()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardData = await res.json()
      setData(dashboardData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border rounded shadow">
          <p className="font-semibold">{label}</p>
          <p className="text-blue-600">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-red-500">Failed to load dashboard data</div>
      </div>
    )
  }

  const stats = [
    { name: 'Total Products', value: data.totalProducts, icon: '📦', color: 'bg-blue-500' },
    { name: 'Low Stock Items', value: data.lowStockProducts, icon: '⚠️', color: 'bg-red-500' },
    { name: 'Total Sales (30d)', value: formatCurrency(data.totalSales), icon: '💰', color: 'bg-green-500' },
    { name: 'Total Purchases (30d)', value: formatCurrency(data.totalPurchases), icon: '📥', color: 'bg-purple-500' },
  ]

  return (
    <div className="p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      {data.salesTrend && data.salesTrend.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#888888" />
              <YAxis stroke="#888888" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" name="Sales" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Recent Sales</h3>
          <div className="space-y-3">
            {data.recentSales && data.recentSales.length > 0 ? (
              data.recentSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium dark:text-white">{sale.receiptNo}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-semibold dark:text-white">{formatCurrency(sale.total)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">No recent sales</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Recent Purchases</h3>
          <div className="space-y-3">
            {data.recentPurchases && data.recentPurchases.length > 0 ? (
              data.recentPurchases.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                  <div>
                    <p className="font-medium dark:text-white">{purchase.invoiceNo}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(purchase.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-semibold dark:text-white">{formatCurrency(purchase.total)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">No recent purchases</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}