'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
  vatCategory: string
}

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
  vatCategory: string
}

interface SaleData {
  id: string
  receiptNo: string
  customer: string | null
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: {
      name: string
      sku: string
      vatCategory: string
    }
  }>
  user: {
    name: string
  }
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [customer, setCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [loading, setLoading] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [lastSale, setLastSale] = useState<SaleData | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/products?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      toast.error('Failed to load products')
    }
  }

  const addToCart = (product: Product) => {
    if (product.quantity === 0) {
      toast.error(`${product.name} is out of stock!`)
      return
    }

    const existingItem = cart.find(item => item.productId === product.id)
    
    if (existingItem) {
      if (existingItem.quantity + 1 > product.quantity) {
        toast.error(`Only ${product.quantity} ${product.name}(s) available`)
        return
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: 1,
        vatCategory: product.vatCategory
      }])
    }
    toast.success(`Added ${product.name} to cart`)
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (newQuantity > product.quantity) {
      toast.error(`Only ${product.quantity} items available`)
      return
    }

    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      ))
    }
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  // Calculate VAT only for vatable items
  const calculateTax = () => {
    const vatableTotal = cart.reduce((sum, item) => {
      if (item.vatCategory === 'VATABLE') {
        return sum + (item.price * item.quantity)
      }
      return sum
    }, 0)
    return vatableTotal * 0.1 // 10% VAT on vatable items only
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handlePrintReceipt = () => {
    const printContent = printRef.current
    if (printContent) {
      const originalContents = document.body.innerHTML
      document.body.innerHTML = printContent.innerHTML
      window.print()
      document.body.innerHTML = originalContents
      window.location.reload()
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        customer,
        paymentMethod,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal()
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      })

      if (res.ok) {
        const sale = await res.json()
        setLastSale(sale)
        setShowReceiptDialog(true)
        setCart([])
        setCustomer('')
        fetchProducts() // Refresh products to update stock
      } else {
        const error = await res.json()
        toast.error(error.error || 'Sale failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReceipt = () => {
    setShowReceiptDialog(false)
    setShowReceiptModal(true)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate totals for display
  const vatableTotal = cart.reduce((sum, item) => {
    if (item.vatCategory === 'VATABLE') {
      return sum + (item.price * item.quantity)
    }
    return sum
  }, 0)
  
  const nonVatableTotal = cart.reduce((sum, item) => {
    if (item.vatCategory === 'NON_VATABLE') {
      return sum + (item.price * item.quantity)
    }
    return sum
  }, 0)

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Products Section */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col">
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    product.quantity === 0
                      ? 'bg-gray-100 cursor-not-allowed opacity-50'
                      : 'hover:shadow-lg hover:border-blue-500'
                  }`}
                >
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">${product.price}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      product.vatCategory === 'VATABLE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.vatCategory === 'VATABLE' ? 'Vatable' : 'Non-Vatable'}
                    </span>
                    <p className={`text-sm ${product.quantity < 5 ? 'text-red-500' : 'text-gray-500'}`}>
                      Stock: {product.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-white rounded-lg shadow flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Shopping Cart</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center">Cart is empty</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.productId} className="border-b pb-3">
                    <div className="flex justify-between mb-2">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          item.vatCategory === 'VATABLE' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.vatCategory === 'VATABLE' ? 'VAT 10%' : 'No VAT'}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Vatable Subtotal:</span>
              <span>${vatableTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Non-Vatable Subtotal:</span>
              <span>${nonVatableTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (10% on vatable items):</span>
              <span>${calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE">Mobile Payment</option>
            </select>
            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Dialog - Same as before */}
      {showReceiptDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-40 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sale Completed Successfully!</h3>
              <p className="text-sm text-gray-500 mb-6">Would you like to generate a receipt?</p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowReceiptDialog(false)
                    toast.success('Sale completed successfully!')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  No
                </button>
                <button
                  onClick={handleGenerateReceipt}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal - Updated to show VAT breakdown */}
      {showReceiptModal && lastSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Sale Receipt</h3>
              <div>
                <button
                  onClick={handlePrintReceipt}
                  className="mr-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Print Receipt
                </button>
                <button
                  onClick={() => {
                    setShowReceiptModal(false)
                    setLastSale(null)
                    toast.success('Sale completed successfully!')
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Printable Receipt Content */}
            <div ref={printRef}>
              <div className="p-6">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">SALE RECEIPT</h1>
                  <p className="text-gray-600">Stock Management System</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p><strong>Receipt #:</strong> {lastSale.receiptNo}</p>
                    <p><strong>Customer:</strong> {lastSale.customer || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p><strong>Date:</strong> {new Date(lastSale.createdAt).toLocaleString()}</p>
                    <p><strong>Sold By:</strong> {lastSale.user?.name || 'Unknown'}</p>
                    <p><strong>Payment Method:</strong> {lastSale.paymentMethod}</p>
                  </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200 mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">VAT</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lastSale.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm">{item.product.name}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">${item.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {item.product.vatCategory === 'VATABLE' ? '10%' : '0%'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right font-bold">Subtotal:</td>
                      <td className="px-4 py-2 text-right">${lastSale.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right font-bold">VAT (10% on vatable items):</td>
                      <td className="px-4 py-2 text-right">${lastSale.tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-lg font-bold">Total:</td>
                      <td className="px-4 py-2 text-right text-lg font-bold">${lastSale.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="text-center text-sm text-gray-500 mt-8">
                  <p>Thank you for your business!</p>
                  <p>VAT is charged at 10% on vatable items only.</p>
                  <p>This is a computer-generated receipt. No signature required.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0,
          .fixed.inset-0 > div {
            visibility: visible;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}