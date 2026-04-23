'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  role: string
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'POS', href: '/pos', icon: '🛒' },
  { name: 'Products', href: '/products', icon: '📦' },
  { name: 'Sales', href: '/sales', icon: '💰' },
  { name: 'Purchases', href: '/purchases', icon: '📥' },
  { name: 'Customers', href: '/customers', icon: '👥' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Debtors', href: '/reports/debtors', icon: '💳' },
  { name: 'Users', href: '/users', icon: '👤' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('USER')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setUserRole(user.role || 'USER')
    }
  }, [])

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'Users' && userRole !== 'ADMIN') return false
    return true
  })

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col h-screen">
      <div className="p-3 border-b border-gray-700">
        <h1 className="text-lg font-bold">Stock Manager</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3 text-base">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        v1.0.0
      </div>
    </aside>
  )
}