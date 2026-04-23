'use client'

import { useSidebar } from '@/context/SidebarContext'

export default function MobileHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Stock Manager</h1>
      </div>
      <div className="w-8" /> {/* Spacer for alignment */}
    </div>
  )
}