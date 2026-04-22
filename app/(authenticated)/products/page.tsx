'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

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
          quantity: 0,
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
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
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filterLowStock}
                onChange={(e) => setFilterLowStock(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Low Stock Items Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className={isLowStock(product) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${product.cost.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isLowStock(product) ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.vatCategory === 'VATABLE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.vatCategory === 'VATABLE' ? 'Vatable' : 'Non-Vatable'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button
                      onClick={() => {
                        setEditingProduct(product)
                        setFormData({
                          name: product.name,
                          sku: product.sku,
                          price: product.price.toString(),
                          cost: product.cost.toString(),
                          lowStockThreshold: product.lowStockThreshold.toString(),
                          vatCategory: product.vatCategory,
                          description: product.description || ''
                        })
                        setShowModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="SKU *"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price *"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cost *"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  type="number"
                  placeholder="Low Stock Threshold"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Category</label>
                  <select
                    value={formData.vatCategory}
                    onChange={(e) => setFormData({ ...formData, vatCategory: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="VATABLE">Vatable (10% VAT)</option>
                    <option value="NON_VATABLE">Non-Vatable (0% VAT)</option>
                  </select>
                </div>
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
                <p className="text-xs text-gray-500">Note: Quantity will be updated through purchases</p>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
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