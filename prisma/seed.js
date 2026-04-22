const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')
  
  try {
    // Clean up existing data in correct order (to avoid foreign key constraints)
    console.log('Cleaning up existing data...')
    
    // Delete in correct order (child tables first)
    await prisma.purchaseItem.deleteMany({})
    await prisma.saleItem.deleteMany({})
    await prisma.purchase.deleteMany({})
    await prisma.sale.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.user.deleteMany({})
    
    console.log('✅ Database cleaned')

    // Create admin user
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN'
      }
    })
    console.log(`✅ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`)

    // Create sample products
    console.log('Creating sample products...')
    const products = [
      { name: 'Laptop', sku: 'LAP001', price: 999.99, cost: 700.00, quantity: 10, lowStockThreshold: 3 },
      { name: 'Mouse', sku: 'MOU001', price: 29.99, cost: 15.00, quantity: 50, lowStockThreshold: 10 },
      { name: 'Keyboard', sku: 'KEY001', price: 79.99, cost: 40.00, quantity: 25, lowStockThreshold: 5 },
      { name: 'Monitor', sku: 'MON001', price: 299.99, cost: 200.00, quantity: 8, lowStockThreshold: 2 },
      { name: 'USB Cable', sku: 'USB001', price: 9.99, cost: 3.00, quantity: 100, lowStockThreshold: 20 },
      { name: 'Headphones', sku: 'HEAD001', price: 149.99, cost: 80.00, quantity: 15, lowStockThreshold: 5 },
    ]

    const createdProducts = []
    for (const product of products) {
      const created = await prisma.product.create({
        data: product
      })
      createdProducts.push(created)
      console.log(`✅ Product created: ${created.name} (SKU: ${created.sku})`)
    }

    // Create a sample purchase
    console.log('Creating sample purchase...')
    const laptop = createdProducts.find(p => p.sku === 'LAP001')
    const mouse = createdProducts.find(p => p.sku === 'MOU001')
    
    if (laptop && mouse) {
      const purchase = await prisma.purchase.create({
        data: {
          invoiceNo: `PO-SAMPLE-${Date.now()}`,
          supplier: 'Sample Supplier Inc.',
          total: (laptop.cost * 5) + (mouse.cost * 10),
          userId: adminUser.id,
          items: {
            create: [
              {
                productId: laptop.id,
                quantity: 5,
                price: laptop.cost,
                total: laptop.cost * 5
              },
              {
                productId: mouse.id,
                quantity: 10,
                price: mouse.cost,
                total: mouse.cost * 10
              }
            ]
          }
        }
      })
      console.log(`✅ Sample purchase created: ${purchase.invoiceNo}`)

      // Update stock for sample purchase
      await prisma.product.update({
        where: { id: laptop.id },
        data: { quantity: { increment: 5 } }
      })
      await prisma.product.update({
        where: { id: mouse.id },
        data: { quantity: { increment: 10 } }
      })
    }

    // Create a sample sale
    console.log('Creating sample sale...')
    const keyboard = createdProducts.find(p => p.sku === 'KEY001')
    const monitor = createdProducts.find(p => p.sku === 'MON001')
    
    if (keyboard && monitor) {
      const sale = await prisma.sale.create({
        data: {
          receiptNo: `SALE-SAMPLE-${Date.now()}`,
          customer: 'John Doe',
          subtotal: keyboard.price + monitor.price,
          tax: (keyboard.price + monitor.price) * 0.1,
          total: (keyboard.price + monitor.price) * 1.1,
          paymentMethod: 'CARD',
          userId: adminUser.id,
          items: {
            create: [
              {
                productId: keyboard.id,
                quantity: 1,
                price: keyboard.price,
                total: keyboard.price
              },
              {
                productId: monitor.id,
                quantity: 1,
                price: monitor.price,
                total: monitor.price
              }
            ]
          }
        }
      })
      console.log(`✅ Sample sale created: ${sale.receiptNo}`)

      // Update stock for sample sale
      await prisma.product.update({
        where: { id: keyboard.id },
        data: { quantity: { decrement: 1 } }
      })
      await prisma.product.update({
        where: { id: monitor.id },
        data: { quantity: { decrement: 1 } }
      })
    }

    console.log('\n🎉 Database seeded successfully!')
    console.log('📊 Summary:')
    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()
    const purchaseCount = await prisma.purchase.count()
    const saleCount = await prisma.sale.count()
    
    console.log(`   - Users: ${userCount}`)
    console.log(`   - Products: ${productCount}`)
    console.log(`   - Purchases: ${purchaseCount}`)
    console.log(`   - Sales: ${saleCount}`)
    console.log('\n🔑 Login credentials:')
    console.log('   Email: admin@example.com')
    console.log('   Password: admin123')
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })