'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import CompactTable from '@/components/UI/CompactTable'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  cost: number
  quantity: number
  lowStockThreshold: number
  vatCategory: string
  description?: string
}

export default function ProductsPage() {
  const { formatCurrency, refreshSettings } = useCurrency()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    lowStockThreshold: '5',
    vatCategory: 'VATABLE',
    description: ''
  })

  useEffect(() => {
    fetchProducts()
    refreshSettings()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, filterLowStock, products])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = [...products]

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterLowStock) {
      filtered = filtered.filter(product => 
        product.quantity <= product.lowStockThreshold
      )
    }

    setFilteredProducts(filtered)
  }

  const isLowStock = (product: Product) => {
    return product.quantity <= product.lowStockThreshold
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
          lowStockThreshold: parseInt(formData.lowStockThreshold),
          quantity: editingProduct ? undefined : 0, // Don't send quantity for edit
          vatCategory: formData.vatCategory
        })
      })

      if (res.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product created')
        setShowModal(false)
        setEditingProduct(null)
        setFormData({ name: '', sku: '', price: '', cost: '', lowStockThreshold: '5', vatCategory: 'VATABLE', description: '' })
        fetchProducts()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Operation failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success('Product deleted')
        fetchProducts()
      } else {
        toast.error('Failed to delete product')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  const productColumns = [
    { key: 'name', header: 'Name', align: 'left' as const },
    { key: 'sku', header: 'SKU', align: 'left' as const },
    { key: 'price', header: 'Price', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'cost', header: 'Cost', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'quantity', header: 'Stock', align: 'right' as const, render: (value: number, row: any) => (
      <span className={value <= row.lowStockThreshold ? 'text-red-600 font-semibold' : ''}>
        {value}
      </span>
    )},
    { key: 'vatCategory', header: 'VAT', align: 'center' as const, render: (value: string) => (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
        value === 'VATABLE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }`}>
        {value === 'VATABLE' ? 'Vatable' : 'Non-Vatable'}
      </span>
    )},
    { key: 'actions', header: 'Actions', align: 'center' as const, render: (_: any, row: any) => (
      <select
        onChange={(e) => {
          const action = e.target.value
          if (action === 'edit') {
            setEditingProduct(row)
            setFormData({
              name: row.name,
              sku: row.sku,
              price: row.price.toString(),
              cost: row.cost.toString(),
              lowStockThreshold: row.lowStockThreshold.toString(),
              vatCategory: row.vatCategory,
              description: row.description || ''
            })
            setShowModal(true)
          } else if (action === 'delete') {
            handleDelete(row.id)
          }
          e.target.value = ''
        }}
        className="text-xs border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-1.5 py-0.5"
        defaultValue=""
      >
        <option value="" disabled>Actions</option>
        <option value="edit">Edit</option>
        <option value="delete">Delete</option>
      </select>
    )}
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Products</h1>
        <button
          onClick={() => {
            setEditingProduct(null)
            setFormData({ name: '', sku: '', price: '', cost: '', lowStockThreshold: '5', vatCategory: 'VATABLE', description: '' })
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Product
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Products</label>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filterLowStock}
                onChange={(e) => setFilterLowStock(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Low Stock Items Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <CompactTable columns={productColumns} data={filteredProducts} />

      {/* Modal - Keep existing modal code but add dark mode classes */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="SKU *"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price *"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cost *"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  required
                />
                <input
                  type="number"
                  placeholder="Low Stock Threshold"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Category</label>
                  <select
                    value={formData.vatCategory}
                    onChange={(e) => setFormData({ ...formData, vatCategory: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  >
                    <option value="VATABLE">Vatable</option>
                    <option value="NON_VATABLE">Non-Vatable</option>
                  </select>
                </div>
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  rows={3}
                />
                {!editingProduct && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Note: Quantity will be updated through purchases</p>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}