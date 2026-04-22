'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
    { name: 'Total Sales (30d)', value: `$${data.totalSales.toFixed(2)}`, icon: '💰', color: 'bg-green-500' },
    { name: 'Total Purchases (30d)', value: `$${data.totalPurchases.toFixed(2)}`, icon: '📥', color: 'bg-purple-500' },
  ]

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      {data.salesTrend && data.salesTrend.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" name="Sales ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {data.recentSales && data.recentSales.length > 0 ? (
              data.recentSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{sale.receiptNo}</p>
                    <p className="text-sm text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-semibold">${sale.total.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No recent sales</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Purchases</h3>
          <div className="space-y-3">
            {data.recentPurchases && data.recentPurchases.length > 0 ? (
              data.recentPurchases.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{purchase.invoiceNo}</p>
                    <p className="text-sm text-gray-500">{new Date(purchase.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-semibold">${purchase.total.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No recent purchases</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}