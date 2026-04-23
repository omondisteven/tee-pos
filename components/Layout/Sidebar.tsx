'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  role: string
}

const shopMainItems = [
  { name: 'POS', href: '/pos', icon: '🛒' },
  { name: 'Products', href: '/products', icon: '📦' },
  { name: 'Sales', href: '/sales', icon: '💰' },
]

const shopReports = [
  { name: 'Debtors', href: '/reports/debtors', icon: '💳' },
  { name: 'Profit & Loss', href: '/reports', icon: '📈' },
]

const garageMainItems = [
  { name: 'New Work Order', href: '/garage/pos', icon: '🔧' },
  { name: 'Work Orders', href: '/garage/services', icon: '📋' },
  { name: 'Service Categories', href: '/garage/categories', icon: '🏷️' },
]

const garageReports = [
  { name: 'Debtors', href: '/garage/reports/debtors', icon: '💳' },
  { name: 'Profit & Loss', href: '/garage/reports/profit-loss', icon: '📈' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('USER')
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [expandedShopReports, setExpandedShopReports] = useState(false)
  const [expandedGarageReports, setExpandedGarageReports] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setUserRole(user.role || 'USER')
    }
  }, [])

  // Auto-expand sections based on current path
  useEffect(() => {
    if (pathname?.startsWith('/garage')) {
      setExpandedModule('garage')
      if (pathname?.startsWith('/garage/reports')) {
        setExpandedGarageReports(true)
      } else {
        setExpandedGarageReports(false)
      }
    } else if (pathname === '/' || pathname?.startsWith('/dashboard') || 
               pathname?.startsWith('/pos') || pathname?.startsWith('/products') ||
               pathname?.startsWith('/sales')) {
      setExpandedModule('shop')
      setExpandedShopReports(false)
    } else if (pathname?.startsWith('/reports')) {
      setExpandedModule('shop')
      setExpandedShopReports(true)
    } else if (pathname?.startsWith('/customers')) {
      // Customers is a top-level item, no module expansion needed
    }
  }, [pathname])

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const toggleModule = (module: string) => {
    if (expandedModule === module) {
      setExpandedModule(null)
      // Reset nested expansions when collapsing module
      setExpandedShopReports(false)
      setExpandedGarageReports(false)
    } else {
      setExpandedModule(module)
      // Reset nested expansions when switching modules
      setExpandedShopReports(false)
      setExpandedGarageReports(false)
    }
  }

  const toggleShopReports = () => {
    setExpandedShopReports(!expandedShopReports)
  }

  const toggleGarageReports = () => {
    setExpandedGarageReports(!expandedGarageReports)
  }

  const userNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  if (userRole === 'ADMIN') {
    userNavigation.splice(1, 0, { name: 'Users', href: '/users', icon: '👤' })
  }

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col h-screen">
      <div className="p-3 border-b border-gray-700">
        <h1 className="text-lg font-bold">Stock Manager</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {/* Dashboard */}
        {userNavigation.slice(0, 1).map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="mr-3 text-base">{item.icon}</span>
            {item.name}
          </Link>
        ))}

        {/* SHOP MODULE */}
        <div className="mt-2">
          <button
            onClick={() => toggleModule('shop')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
              expandedModule === 'shop'
                ? 'bg-gray-900 text-white'
                : 'text-gray-200 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-3 text-base">🏪</span>
              SHOP
            </div>
            <svg className={`w-4 h-4 transition-transform ${expandedModule === 'shop' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedModule === 'shop' && (
            <div className="ml-4">
              {/* Main Shop Items */}
              {shopMainItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-sm">{item.icon}</span>
                  {item.name}
                </Link>
              ))}

              {/* Shop Reports Dropdown */}
              <div>
                <button
                  onClick={toggleShopReports}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    expandedShopReports
                      ? 'text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-sm">📊</span>
                    Reports
                  </div>
                  <svg className={`w-3 h-3 transition-transform ${expandedShopReports ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedShopReports && (
                  <div className="ml-6">
                    {shopReports.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-1.5 text-sm transition-colors ${
                          isActive(item.href)
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <span className="mr-3 text-xs">{item.icon}</span>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GARAGE MODULE */}
        <div className="mt-1">
          <button
            onClick={() => toggleModule('garage')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
              expandedModule === 'garage'
                ? 'bg-gray-900 text-white'
                : 'text-gray-200 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-3 text-base">🔧</span>
              GARAGE
            </div>
            <svg className={`w-4 h-4 transition-transform ${expandedModule === 'garage' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedModule === 'garage' && (
            <div className="ml-4">
              {/* Main Garage Items */}
              {garageMainItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-sm">{item.icon}</span>
                  {item.name}
                </Link>
              ))}

              {/* Garage Reports Dropdown */}
              <div>
                <button
                  onClick={toggleGarageReports}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    expandedGarageReports
                      ? 'text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-sm">📊</span>
                    Reports
                  </div>
                  <svg className={`w-3 h-3 transition-transform ${expandedGarageReports ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedGarageReports && (
                  <div className="ml-6">
                    {garageReports.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-1.5 text-sm transition-colors ${
                          isActive(item.href)
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <span className="mr-3 text-xs">{item.icon}</span>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider before Customers */}
        <div className="my-3 border-t border-gray-700" />

        {/* Customers - Top Level Item */}
        <Link
          href="/customers"
          className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
            isActive('/customers')
              ? 'bg-gray-900 text-white border-l-4 border-blue-500'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span className="mr-3 text-base">👥</span>
          Customers
        </Link>

        {/* Divider between Customers and Users */}
        <div className="my-3 border-t border-gray-700" />

        {/* Users and Settings */}
        {userNavigation.slice(1).map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="mr-3 text-base">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        v1.0.0
      </div>
    </aside>
  )
}