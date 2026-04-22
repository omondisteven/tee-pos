'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Sale {
  id: string
  receiptNo: string
  customer: string
  total: number
  createdAt: string
  user: { name: string }
  items: Array<{
    quantity: number
    price: number
    total: number
    product: { name: string }
  }>
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/sales', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSales(data.sales || [])
    } catch (error) {
      toast.error('Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sales History</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-6 py-4 whitespace-nowrap">{sale.receiptNo}</td>
                <td className="px-6 py-4 whitespace-nowrap">{sale.customer || 'Walk-in'}</td>
                <td className="px-6 py-4 whitespace-nowrap">${sale.total.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(sale.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{sale.user?.name || 'Unknown'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedSale(sale)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Sale Details</h3>
            <div className="space-y-2">
              <p><strong>Receipt:</strong> {selectedSale.receiptNo}</p>
              <p><strong>Customer:</strong> {selectedSale.customer || 'Walk-in'}</p>
              <p><strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
              <p><strong>Total:</strong> ${selectedSale.total.toFixed(2)}</p>
              <p><strong>Items:</strong></p>
              <ul className="list-disc pl-5">
                {selectedSale.items.map((item, idx) => (
                  <li key={idx}>
                    {item.product.name} - {item.quantity} x ${item.price.toFixed(2)} = ${item.total.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}