// app\api\purchases\[id]\route.ts
// This file defines API route handlers for managing purchases in a Next.js application.
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 }
      )
    }

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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { action, cancelReason } = body

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

    // Handle cancellation action
    if (action === 'CANCEL') {
      if (!cancelReason || cancelReason.trim() === '') {
        return NextResponse.json(
          { error: 'Cancellation reason is required' },
          { status: 400 }
        )
      }

      if (existingPurchase.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Purchase is already cancelled' },
          { status: 400 }
        )
      }

      try {
        // Reverse stock quantities
        for (const item of existingPurchase.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                decrement: item.quantity
              }
            }
          })
        }

        // Update purchase status
        const updatedPurchase = await prisma.purchase.update({
          where: { id: id },
          data: {
            status: 'CANCELLED',
            cancelReason: cancelReason,
            cancelledAt: new Date()
          },
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

        return NextResponse.json(updatedPurchase)
      } catch (error) {
        console.error('Error in cancellation operation:', error)
        return NextResponse.json(
          { error: 'Failed to cancel purchase' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Update purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}