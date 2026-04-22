import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// Get settings
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create settings for the user
    let settings = await prisma.settings.findUnique({
      where: { userId: authUser.userId }
    })

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.settings.create({
        data: {
          userId: authUser.userId,
          theme: 'LIGHT',
          currency: 'USD',
          currencySymbol: '$',
          vatPercentage: 10,
          lowStockAlert: true,
          autoBackup: false,
          dateFormat: 'MM/DD/YYYY',
          language: 'EN',
          receiptFooter: 'Thank you for your business!',
          companyName: 'Stock Management System',
          companyEmail: 'admin@example.com',
          companyPhone: '+1 234 567 8900',
          companyAddress: '123 Business St, City, Country'
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update settings
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      theme,
      currency,
      currencySymbol,
      vatPercentage,
      lowStockAlert,
      autoBackup,
      dateFormat,
      language,
      receiptFooter,
      companyName,
      companyEmail,
      companyPhone,
      companyAddress
    } = body

    const settings = await prisma.settings.upsert({
      where: { userId: authUser.userId },
      update: {
        theme,
        currency,
        currencySymbol,
        vatPercentage,
        lowStockAlert,
        autoBackup,
        dateFormat,
        language,
        receiptFooter,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress
      },
      create: {
        userId: authUser.userId,
        theme: theme || 'LIGHT',
        currency: currency || 'USD',
        currencySymbol: currencySymbol || '$',
        vatPercentage: vatPercentage || 10,
        lowStockAlert: lowStockAlert !== undefined ? lowStockAlert : true,
        autoBackup: autoBackup || false,
        dateFormat: dateFormat || 'MM/DD/YYYY',
        language: language || 'EN',
        receiptFooter: receiptFooter || 'Thank you for your business!',
        companyName: companyName || 'Stock Management System',
        companyEmail: companyEmail || 'admin@example.com',
        companyPhone: companyPhone || '+1 234 567 8900',
        companyAddress: companyAddress || '123 Business St, City, Country'
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}