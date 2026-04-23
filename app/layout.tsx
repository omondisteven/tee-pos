import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { SettingsProvider } from '@/context/SettingsContext'
import { CurrencyProvider } from '@/context/CurrencyContext'
import { SidebarProvider } from '@/context/SidebarContext'

export const metadata: Metadata = {
  title: 'Stock Management System',
  description: 'Complete stock and sales management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <CurrencyProvider>
            <SidebarProvider>
              <Toaster position="top-right" />
              {children}
            </SidebarProvider>
          </CurrencyProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}