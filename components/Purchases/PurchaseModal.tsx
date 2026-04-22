'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  cost: number
  quantity: number
}

interface PurchaseItem {
  id?: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  cost: number
  total: number
}

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingPurchase?: any
}

export default function PurchaseModal({ isOpen, onClose, onSuccess, editingPurchase }: PurchaseModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [invoiceNo, setInvoiceNo] = useState('')
  const [supplier, setSupplier] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
      if (editingPurchase) {
        loadPurchaseForEdit()
      } else {
        generateInvoiceNumber()
      }
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/products?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      toast.error('Failed to load products')
    }
  }

  const generateInvoiceNumber = () => {
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 1000)
    setInvoiceNo(`PO-${timestamp}-${random}`)
  }

  const loadPurchaseForEdit = () => {
    if (editingPurchase) {
      setInvoiceNo(editingPurchase.invoiceNo)
      setSupplier(editingPurchase.supplier || '')
      const purchaseItems = editingPurchase.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        cost: item.price,
        total: item.total
      }))
      setItems(purchaseItems)
    }
  }

  // Filter products based on search term (name or SKU)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(`${product.name} (${product.sku})`)
    setShowDropdown(false)
  }

  const addItem = () => {
    if (!selectedProduct) {
      toast.error('Please select a product from the dropdown')
      return
    }

    const existingItem = items.find(item => item.productId === selectedProduct.id)
    if (existingItem) {
      toast.error('Product already added. Edit quantity instead.')
      return
    }

    const newItem: PurchaseItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSku: selectedProduct.sku,
      quantity: 1,
      cost: selectedProduct.cost,
      total: selectedProduct.cost
    }

    setItems([...items, newItem])
    setSelectedProduct(null)
    setSearchTerm('')
    setShowDropdown(false)
    toast.success(`${selectedProduct.name} added to purchase`)
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'cost') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].cost
    }
    
    setItems(updatedItems)
  }

  const removeItem = (index: number) => {
    if (confirm('Remove this item?')) {
      const removedItem = items[index]
      setItems(items.filter((_, i) => i !== index))
      toast.success(`${removedItem.productName} removed from purchase`)
    }
  }

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const validateItems = () => {
    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`${item.productName} has invalid quantity`)
        return false
      }
      if (item.cost <= 0) {
        toast.error(`${item.productName} has invalid cost price`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    if (!invoiceNo) {
      toast.error('Invoice number is required')
      return
    }

    if (!validateItems()) {
      return
    }

    setLoading(true)
    const toastId = toast.loading(editingPurchase ? 'Updating purchase...' : 'Creating purchase...')
    
    try {
      const token = localStorage.getItem('token')
      const purchaseData = {
        invoiceNo,
        supplier: supplier || null,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost
        })),
        total: calculateGrandTotal()
      }

      console.log('Sending purchase data:', purchaseData)

      const url = editingPurchase ? `/api/purchases/${editingPurchase.id}` : '/api/purchases'
      const method = editingPurchase ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(purchaseData)
      })

      const responseData = await res.json()
      console.log('Server response:', responseData)

      if (res.ok) {
        toast.success(editingPurchase ? 'Purchase updated successfully!' : 'Purchase created successfully!', { id: toastId })
        onSuccess()
        onClose()
        resetForm()
      } else {
        toast.error(responseData.error || 'Operation failed', { id: toastId })
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('An error occurred. Check console for details.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    generateInvoiceNumber()
    setSupplier('')
    setItems([])
    setSelectedProduct(null)
    setSearchTerm('')
    setShowDropdown(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {editingPurchase ? 'Edit Purchase' : 'Create New Purchase'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice/Reference Number *
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Supplier name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Add Product Section */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Products to Purchase
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowDropdown(true)
                    setSelectedProduct(null)
                  }}
                  onClick={() => setShowDropdown(true)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Click to search products by Name or SKU..."
                  disabled={loading}
                />
                
                {/* Dropdown - shows all products when clicked, filters as you type */}
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku} | Cost: ${product.cost.toFixed(2)} | Stock: {product.quantity}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-gray-500">
                        {searchTerm ? 'No products found matching your search' : 'No products available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!selectedProduct || loading}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>
              {selectedProduct && (
                <div className="flex items-center text-sm text-green-600">
                  ✓ Ready to add: {selectedProduct.name}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No items added. Search and select a product from the dropdown above.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2">{item.productSku}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost}
                          onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium">${item.total.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Items: {items.length}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">Grand Total: ${calculateGrandTotal().toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (editingPurchase ? 'Updating...' : 'Saving...') : (editingPurchase ? 'Update Purchase' : 'Save Purchase')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}