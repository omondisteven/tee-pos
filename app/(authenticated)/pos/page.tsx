'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
}

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [customer, setCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [loading, setLoading] = useState(false)

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
        quantity: 1
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

  const calculateTax = () => {
    return calculateSubtotal() * 0.1 // 10% tax
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
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
        toast.success('Sale completed successfully!')
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                  <p className={`text-sm ${product.quantity < 5 ? 'text-red-500' : 'text-gray-500'}`}>
                    Stock: {product.quantity}
                  </p>
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
                      <span className="font-medium">{item.name}</span>
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
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (10%):</span>
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
    </div>
  )
}