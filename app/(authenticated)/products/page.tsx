// app/(authenticated)/products/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import CompactTable from '@/components/UI/CompactTable'

// Define the UnitOfMeasure type to match the enum
type UnitOfMeasure = 'PCS' | 'KGS' | 'GMS' | 'LTR' | 'MLS' | 'MTR' | 'BOX' | 'DOZ' | 'PAIR' | 'SET' | 'ROLL' | 'PKT'

interface Product {
  id: string
  name: string
  sku: string
  unit: UnitOfMeasure
  price: number
  cost: number
  quantity: number
  lowStockThreshold: number
  vatCategory: string
  description?: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Unit display names for better readability
const unitDisplayNames: Record<UnitOfMeasure, string> = {
  PCS: 'Pieces',
  KGS: 'Kilograms',
  GMS: 'Grams',
  LTR: 'Liters',
  MLS: 'Milliliters',
  MTR: 'Meters',
  BOX: 'Box',
  DOZ: 'Dozen',
  PAIR: 'Pair',
  SET: 'Set',
  ROLL: 'Roll',
  PKT: 'Packet'
}

export default function ProductsPage() {
  const { formatCurrency, refreshSettings } = useCurrency()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unit: 'GMS' as UnitOfMeasure,
    price: '',
    cost: '',
    lowStockThreshold: '',
    vatCategory: 'NON_VATABLE',
    description: ''
  })

  useEffect(() => {
    fetchProducts()
    refreshSettings()
  }, [])

  // Fetch products when search, filter, or page changes
  useEffect(() => {
    // Use debounce to prevent too many API calls
    const timer = setTimeout(() => {
      fetchProducts()
    }, 1000)

    return () => clearTimeout(timer)
  }, [searchTerm, filterLowStock, pagination.page])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Build query parameters
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      if (filterLowStock) {
        params.append('lowStock', 'true')
      }
      
      const res = await fetch(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      setProducts(data.products || [])
      setPagination(data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      })
    } catch (error) {
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    // Don't reset page here - keep current page
  }

  const handleLowStockFilter = (checked: boolean) => {
    setFilterLowStock(checked)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page on filter
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const submitData = {
        name: formData.name,
        sku: formData.sku,
        unit: formData.unit,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : 5,
        vatCategory: formData.vatCategory,
        description: formData.description
      }

      // Only include quantity for new products
      if (!editingProduct) {
        Object.assign(submitData, { quantity: 0 })
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      })

      if (res.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product created')
        setShowModal(false)
        setEditingProduct(null)
        setFormData({ 
          name: '', 
          sku: '', 
          unit: 'GMS', 
          price: '', 
          cost: '', 
          lowStockThreshold: '', 
          vatCategory: 'NON_VATABLE', 
          description: '' 
        })
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
    { key: 'sku', header: 'ITEM CODE', align: 'left' as const },
    { 
      key: 'unit', 
      header: 'Unit', 
      align: 'center' as const,
      render: (value: UnitOfMeasure) => unitDisplayNames[value] || value
    },
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
              unit: row.unit,
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

  // Pagination component
  const renderPagination = () => {
    const { page, totalPages } = pagination
    if (totalPages <= 1) return null

    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{((page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {startPage > 1 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    1
                  </button>
                  {startPage > 2 && (
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                      ...
                    </span>
                  )}
                </>
              )}
              
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    p === page
                      ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-500 text-blue-600 dark:text-blue-200'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
              
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && (
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                      ...
                    </span>
                  )}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Products</h1>
        <button
          onClick={() => {
            setEditingProduct(null)
            setFormData({ 
              name: '', 
              sku: '', 
              unit: 'GMS', 
              price: '', 
              cost: '', 
              lowStockThreshold: '', 
              vatCategory: 'NON_VATABLE', 
              description: '' 
            })
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
              placeholder="Search by name or Item Code..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              autoFocus={false}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {searchTerm && `Showing results for "${searchTerm}"`}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filterLowStock}
                onChange={(e) => handleLowStockFilter(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Low Stock Items Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <CompactTable columns={productColumns} data={products} />
        {renderPagination()}
      </div>

      {/* Modal */}
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
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Item Code *"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-500 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {/* Unit Selection Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitOfMeasure })}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="KGS">Kilograms (KGS)</option>
                    <option value="GMS">Grams (GMS)</option>
                    <option value="LTR">Liters (LTR)</option>
                    <option value="MLS">Milliliters (MLS)</option>
                    <option value="MTR">Meters (MTR)</option>
                    <option value="BOX">Box (BOX)</option>
                    <option value="DOZ">Dozen (DOZ)</option>
                    <option value="PAIR">Pair (PAIR)</option>
                    <option value="SET">Set (SET)</option>
                    <option value="ROLL">Roll (ROLL)</option>
                    <option value="PKT">Packet (PKT)</option>
                  </select>
                </div>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Price *"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cost *"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Low Stock Threshold (Default: 5)"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Category</label>
                  <select
                    value={formData.vatCategory}
                    onChange={(e) => setFormData({ ...formData, vatCategory: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VATABLE">Vatable</option>
                    <option value="NON_VATABLE">Non-Vatable</option>
                  </select>
                </div>
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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