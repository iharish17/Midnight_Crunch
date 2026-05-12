import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { ObjectId } from 'mongodb'
import { getAdminsCollection, getFoodItemsCollection, getOrdersCollection, getUsersCollection } from '../mongoClient.js'
import { requireAdmin } from '../middleware/adminAuth.js'

const router = Router()

const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'packed', 'on_the_way', 'delivered']

function getNextOrderStatus(currentStatus) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus)
  if (currentIndex === -1 || currentIndex >= ORDER_STATUS_FLOW.length - 1) {
    return null
  }

  return ORDER_STATUS_FLOW[currentIndex + 1]
}

// Admin Register
router.post('/admin/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const admins = getAdminsCollection()

    // Only one admin account is allowed for the whole system.
    const existingAdminCount = await admins.countDocuments()
    if (existingAdminCount > 0) {
      return res.status(403).json({ message: 'Admin registration is closed. Only one admin account is allowed.' })
    }

    const existing = await admins.findOne({ email: normalizedEmail })

    if (existing) {
      return res.status(400).json({ message: 'Admin with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const result = await admins.insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      sessionToken: token,
      sessionTokenExpiry: tokenExpiry,
      createdAt: new Date(),
    })

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      admin: { id: result.insertedId, email: normalizedEmail },
    })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Registration failed' })
  }
})

// Check if an admin exists
router.get('/admin/check-exists', async (req, res) => {
  try {
    const admins = getAdminsCollection()
    const count = await admins.countDocuments()
    return res.json({ adminExists: count > 0 })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Check failed' })
  }
})

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const admins = getAdminsCollection()
    const admin = await admins.findOne({ email: normalizedEmail })

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' })
    }

    const passwordMatch = await bcrypt.compare(password, admin.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await admins.updateOne(
      { _id: admin._id },
      { $set: { sessionToken: token, sessionTokenExpiry: tokenExpiry, lastLogin: new Date() } }
    )

    res.json({ token, admin: { id: admin._id, email: admin.email } })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed' })
  }
})

// Admin get all orders with customer details
router.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const ordersCollection = getOrdersCollection()
    const usersCollection = getUsersCollection()

    const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray()

    // Enrich orders with customer details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const userId = typeof order.userId === 'string' ? order.userId : String(order.userId)
        const user = ObjectId.isValid(userId) ? await usersCollection.findOne({ _id: new ObjectId(userId) }) : null
        const customer = user
          ? {
            id: user._id,
            name: user.name,
            email: user.email,
            hostelAndRoom: user.hostelAndRoom,
            mobileNumber: user.mobileNumber,
            year: user.year,
          }
          : order.customerSnapshot || null

        return {
          ...order,
          customer,
        }
      }),
    )

    return res.json({ orders: enrichedOrders })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch orders' })
  }
})

// Admin get food items
router.get('/admin/items', requireAdmin, async (req, res) => {
  try {
    const foodItems = getFoodItemsCollection()
    const items = await foodItems.find({}).sort({ createdAt: -1 }).toArray()
    return res.json({ items })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch items' })
  }
})

// Admin add food item
router.post('/admin/items', requireAdmin, async (req, res) => {
  try {
    const body = req.body ?? {}
    const name = body.name ?? body.itemName ?? body.title ?? ''
    const description = body.description ?? body.details ?? ''
    const price = body.price ?? body.itemPrice ?? body.amount ?? ''
    const imageUrl = body.imageUrl ?? body.image_url ?? body.image ?? ''
    const quantity = body.quantity ?? 0
    const trimmedName = String(name).trim()
    const trimmedPrice = String(price).trim()
    const numericPrice = Number(trimmedPrice)
    const numericQuantity = Math.max(0, Number(quantity))

    if (!trimmedName) {
      return res.status(400).json({ message: 'Item name is required' })
    }

    if (!trimmedPrice) {
      return res.status(400).json({ message: 'Item price is required' })
    }

    if (Number.isNaN(numericPrice)) {
      return res.status(400).json({ message: 'Price must be a valid number' })
    }

    const foodItems = getFoodItemsCollection()
    const result = await foodItems.insertOne({
      name: trimmedName,
      description: description?.trim() || '',
      price: numericPrice,
      quantity: numericQuantity,
      imageUrl: imageUrl?.trim() || '',
      image_url: imageUrl?.trim() || '',
      isAvailable: true,
      createdAt: new Date(),
    })

    const item = await foodItems.findOne({ _id: result.insertedId })
    return res.status(201).json({ item })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to add item' })
  }
})

// Admin update item quantity
router.patch('/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { quantity } = req.body ?? {}

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ message: 'Quantity is required' })
    }

    const numericQuantity = Math.max(0, Number(quantity))

    if (Number.isNaN(numericQuantity)) {
      return res.status(400).json({ message: 'Quantity must be a valid number' })
    }

    const foodItems = getFoodItemsCollection()

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid item id' })
    }

    const result = await foodItems.updateOne(
      { _id: new ObjectId(id) },
      { $set: { quantity: numericQuantity, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const updated = await foodItems.findOne({ _id: new ObjectId(id) })
    return res.json({ item: updated })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update item' })
  }
})

// Admin delete food item
router.delete('/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const foodItems = getFoodItemsCollection()

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid item id' })
    }

    const result = await foodItems.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' })
    }

    return res.json({ message: 'Item deleted successfully' })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to delete item' })
  }
})

// Admin update order status
router.patch('/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body ?? {}

    if (!status) {
      return res.status(400).json({ message: 'Status is required' })
    }

    const ordersCollection = getOrdersCollection()

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id' })
    }

    const existingOrder = await ordersCollection.findOne({ _id: new ObjectId(id) })
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const currentStatus = existingOrder.status || 'pending'
    const expectedNextStatus = getNextOrderStatus(currentStatus)

    if (!expectedNextStatus) {
      return res.status(400).json({ message: `Order in status "${currentStatus}" cannot be advanced` })
    }

    if (status !== expectedNextStatus) {
      return res.status(400).json({ message: `Invalid transition. Next status must be "${expectedNextStatus}"` })
    }

    const result = await ordersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } })

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const updated = await ordersCollection.findOne({ _id: new ObjectId(id) })
    return res.json({ order: updated })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update order' })
  }
})

export default router
