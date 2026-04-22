import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Get sales data
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Get purchases data
    const purchases = await prisma.purchase.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Calculate metrics
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0)

    // Calculate cost of goods sold (COGS)
    let cogs = 0
    for (const sale of sales) {
      for (const item of sale.items) {
        cogs += item.product.cost * item.quantity
      }
    }

    const grossProfit = totalSales - cogs
    const netProfit = grossProfit - totalPurchases

    // Get top selling products
    const productSales = new Map()
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productId
        if (!productSales.has(key)) {
          productSales.set(key, {
            product: item.product,
            quantity: 0,
            revenue: 0
          })
        }
        const data = productSales.get(key)
        data.quantity += item.quantity
        data.revenue += item.total
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const report = {
      period: {
        startDate: start,
        endDate: end
      },
      summary: {
        totalSales,
        totalPurchases,
        cogs,
        grossProfit,
        netProfit,
        grossProfitMargin: totalSales > 0 ? (grossProfit / totalSales) * 100 : 0,
        netProfitMargin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0
      },
      salesCount: sales.length,
      purchaseCount: purchases.length,
      topProducts,
      dailyBreakdown: generateDailyBreakdown(sales, purchases, start, end)
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateDailyBreakdown(sales: any[], purchases: any[], start: Date, end: Date) {
  const breakdown = []
  const currentDate = new Date(start)

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const daySales = sales.filter(sale => 
      sale.createdAt.toISOString().split('T')[0] === dateStr
    )
    const dayPurchases = purchases.filter(purchase => 
      purchase.createdAt.toISOString().split('T')[0] === dateStr
    )

    breakdown.push({
      date: dateStr,
      sales: daySales.reduce((sum, sale) => sum + sale.total, 0),
      purchases: dayPurchases.reduce((sum, purchase) => sum + purchase.total, 0),
      salesCount: daySales.length,
      purchaseCount: dayPurchases.length
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return breakdown
}