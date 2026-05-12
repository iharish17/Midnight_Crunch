import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getUsersCollection } from '../mongoClient.js'
import { getOrdersCollection } from '../mongoClient.js'
import { requireUser } from '../middleware/userAuth.js'

const router = Router()

// User Register
router.post('/user/register', async (req, res) => {
  try {
    const { name, email, hostelAndRoom, mobileNumber, year, password } = req.body

    if (!name || !email || !hostelAndRoom || !mobileNumber || !year || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const users = getUsersCollection()
    const existing = await users.findOne({ email })

    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString('hex')

    const result = await users.insertOne({
      name: name.trim(),
      email: email.trim(),
      hostelAndRoom: hostelAndRoom.trim(),
      mobileNumber: String(mobileNumber).trim(),
      year: String(year).trim(),
      password: hashedPassword,
      sessionToken: token,
      createdAt: new Date(),
    })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.insertedId, name, email },
    })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Registration failed' })
  }
})

// User Login
router.post('/user/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const users = getUsersCollection()
    const user = await users.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = crypto.randomBytes(32).toString('hex')

    await users.updateOne(
      { _id: user._id },
      { $set: { sessionToken: token, lastLogin: new Date() } }
    )

    res.json({ token, user: { id: user._id, name: user.name, email } })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed' })
  }
})

// Profile & Orders
router.get('/user/me', requireUser, async (req, res) => {
  const user = req.user
  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      hostelAndRoom: user.hostelAndRoom,
      mobileNumber: user.mobileNumber,
      year: user.year,
    },
  })
})

router.post('/user/orders', requireUser, async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' })
    }

    const { getFoodItemsCollection } = await import('../mongoClient.js')
    const { ObjectId } = await import('mongodb')
    const foodItems = getFoodItemsCollection()
    const normalizedItems = []

    // Check and decrease item quantities
    for (const item of items) {
      if (!item.itemId) continue

      const orderQuantity = Math.max(1, parseInt(item.qty, 10) || 1)
      
      const itemId = item.itemId instanceof ObjectId ? item.itemId : new ObjectId(item.itemId)
      const foodItem = await foodItems.findOne({ _id: itemId })
      
      if (!foodItem) {
        return res.status(400).json({ message: `Item ${item.name} not found` })
      }
      
      const currentQuantity = foodItem.quantity || 0
      
      if (currentQuantity < orderQuantity) {
        return res.status(400).json({ message: `${item.name} - only ${currentQuantity} available` })
      }
      
      await foodItems.updateOne(
        { _id: itemId },
        { $set: { quantity: currentQuantity - orderQuantity } }
      )

      normalizedItems.push({
        ...item,
        qty: orderQuantity,
      })
    }

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'No valid order items were provided' })
    }

    const orders = getOrdersCollection()
    const order = {
      userId: req.user._id,
      customerSnapshot: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        hostelAndRoom: req.user.hostelAndRoom,
        mobileNumber: req.user.mobileNumber,
        year: req.user.year,
      },
      items: normalizedItems,
      total: normalizedItems.reduce((s, it) => s + (Number(it.price) || 0) * (it.qty || 1), 0),
      status: 'pending',
      createdAt: new Date(),
      eta: null,
    }

    const result = await orders.insertOne(order)
    const created = await orders.findOne({ _id: result.insertedId })
    return res.status(201).json({ order: created })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/user/orders', requireUser, async (req, res) => {
  try {
    const orders = getOrdersCollection()
    const list = await orders.find({ userId: req.user._id }).sort({ createdAt: -1 }).toArray()
    return res.json({ orders: list })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/user/orders/:id', requireUser, async (req, res) => {
  try {
    const orders = getOrdersCollection()
    const { id } = req.params
    const { ObjectId } = await import('mongodb')
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid order id' })
    const order = await orders.findOne({ _id: new ObjectId(id), userId: req.user._id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    return res.json({ order })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

export default router
