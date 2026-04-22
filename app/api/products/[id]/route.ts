import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, price, cost, quantity, lowStockThreshold, vatCategory, description } = body

    // Get current product to preserve quantity if not provided
    const currentProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Use existing quantity if new quantity is not provided or is 0
    const newQuantity = quantity !== undefined && quantity !== null && quantity !== 0 
      ? parseInt(quantity) 
      : currentProduct.quantity

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: parseFloat(price),
        cost: parseFloat(cost),
        quantity: newQuantity,
        lowStockThreshold: parseInt(lowStockThreshold),
        vatCategory: vatCategory || currentProduct.vatCategory,
        description
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Update product error:', error)
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

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}