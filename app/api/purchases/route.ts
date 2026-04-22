import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { invoiceNo, supplier, items, total } = body

    console.log('Received purchase data:', { invoiceNo, supplier, items, total })
    console.log('Authenticated user:', authUser)

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in purchase' },
        { status: 400 }
      )
    }

    if (!invoiceNo) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      )
    }

    // Check if invoice number already exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { invoiceNo }
    })

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Invoice number already exists' },
        { status: 400 }
      )
    }

    // Create purchase using sequential operations (more reliable)
    try {
      // 1. Create the purchase record with userId
      const purchase = await prisma.purchase.create({
        data: {
          invoiceNo,
          supplier: supplier || null,
          total,
          userId: authUser.userId  // Make sure this is included!
        }
      })

      console.log('Purchase created:', purchase.id)

      // 2. Create all purchase items
      for (const item of items) {
        const purchaseItem = await prisma.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.cost,
            total: item.cost * item.quantity
          }
        })
        console.log('Purchase item created:', purchaseItem.id)
      }

      // 3. Update stock quantities for each product
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        })
        console.log('Stock updated for product:', item.productId)
      }

      // 4. Fetch the complete purchase with items and product details
      const completePurchase = await prisma.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json(completePurchase, { status: 201 })
      
    } catch (error) {
      console.error('Error in purchase creation:', error)
      return NextResponse.json(
        { error: 'Failed to create purchase: ' + (error as Error).message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Create purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchase.count()
    ])

    return NextResponse.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}