import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get total products
    const totalProducts = await prisma.product.count()

    // Get low stock products using raw SQL (more efficient)
    const lowStockResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM "Product" 
      WHERE quantity <= "lowStockThreshold"
    `
    const lowStockProducts = Number(lowStockResult[0].count)

    // Get total sales for last 30 days
    const totalSalesResult = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: {
        total: true
      }
    })
    const totalSales = totalSalesResult._sum.total || 0

    // Get total purchases for last 30 days
    const totalPurchasesResult = await prisma.purchase.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: {
        total: true
      }
    })
    const totalPurchases = totalPurchasesResult._sum.total || 0

    // Get recent sales
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    // Get recent purchases
    const recentPurchases = await prisma.purchase.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    // Get sales trend for last 7 days
    const salesTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      const dailySales = await prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        },
        _sum: {
          total: true
        }
      })
      
      salesTrend.push({
        date: date.toLocaleDateString(),
        sales: dailySales._sum.total || 0
      })
    }

    return NextResponse.json({
      totalProducts,
      lowStockProducts,
      totalSales,
      totalPurchases,
      recentSales,
      recentPurchases,
      salesTrend
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}