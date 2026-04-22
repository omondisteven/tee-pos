import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await the params promise to get the id
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 }
      )
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: id },
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

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Get purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await the params promise to get the id
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 }
      )
    }

    // Get purchase to reverse stock
    const purchase = await prisma.purchase.findUnique({
      where: { id: id },
      include: { items: true }
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Reverse stock and delete
    try {
      // Reverse stock quantities
      for (const item of purchase.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        })
      }

      // Delete purchase (items will cascade delete)
      await prisma.purchase.delete({
        where: { id: id }
      })

      return NextResponse.json({ message: 'Purchase deleted successfully' })
    } catch (error) {
      console.error('Error in delete operation:', error)
      return NextResponse.json(
        { error: 'Failed to delete purchase' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Delete purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await the params promise to get the id
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { invoiceNo, supplier, items, total } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in purchase' },
        { status: 400 }
      )
    }

    // Get existing purchase
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: id },
      include: { items: true }
    })

    if (!existingPurchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Update in transaction
    try {
      // Reverse old stock quantities
      for (const oldItem of existingPurchase.items) {
        await prisma.product.update({
          where: { id: oldItem.productId },
          data: {
            quantity: {
              decrement: oldItem.quantity
            }
          }
        })
      }

      // Delete old items
      await prisma.purchaseItem.deleteMany({
        where: { purchaseId: id }
      })

      // Update purchase
      const updatedPurchase = await prisma.purchase.update({
        where: { id: id },
        data: {
          invoiceNo,
          supplier,
          total,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.cost,
              total: item.cost * item.quantity
            }))
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

      // Apply new stock quantities
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        })
      }

      return NextResponse.json(updatedPurchase)
    } catch (error) {
      console.error('Error in update operation:', error)
      return NextResponse.json(
        { error: 'Failed to update purchase' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Update purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}