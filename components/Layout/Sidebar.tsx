'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'POS', href: '/pos', icon: '🛒' },
  { name: 'Products', href: '/products', icon: '📦' },
  { name: 'Sales', href: '/sales', icon: '💰' },
  { name: 'Purchases', href: '/purchases', icon: '📥' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-800 text-white">
      <div className="p-4">
        <h1 className="text-xl font-bold">Stock Manager</h1>
      </div>
      <nav className="mt-8">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}