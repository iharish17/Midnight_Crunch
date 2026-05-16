import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { ObjectId } from 'mongodb'
import { getUsersCollection, getEmailOtpsCollection } from '../mongoClient.js'
import { getOrdersCollection, getFoodItemsCollection } from '../mongoClient.js'
import { requireUser } from '../middleware/userAuth.js'

const router = Router()
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10)
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60)
const OTP_MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5)
const OTP_SECRET = process.env.OTP_SECRET || 'dev-otp-secret-change-me'
let otpTransporter

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000))
}

function hashOtp(email, otp) {
  return crypto.createHash('sha256').update(`${email}:${otp}:${OTP_SECRET}`).digest('hex')
}

function getOtpTransporter() {
  if (otpTransporter) {
    return otpTransporter
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured for OTP emails')
  }

  otpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  })

  return otpTransporter
}

async function sendRegistrationOtpEmail(email, otp) {
  const from = process.env.OTP_EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER
  if (!from) {
    throw new Error('OTP email sender is not configured')
  }

  const transporter = getOtpTransporter()

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Midnight Crunch OTP Verification',
    text: `Your Midnight Crunch OTP is ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your Midnight Crunch OTP is <strong>${otp}</strong>.</p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  })
}

// Send registration OTP
router.post('/user/register/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' })
    }

    const users = getUsersCollection()
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    const otps = getEmailOtpsCollection()
    const existingOtpRecord = await otps.findOne({ email })
    const now = new Date()

    if (existingOtpRecord?.resendAvailableAt && new Date(existingOtpRecord.resendAvailableAt) > now) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(existingOtpRecord.resendAvailableAt).getTime() - now.getTime()) / 1000),
      )
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds}s before requesting another OTP`,
        retryAfterSeconds,
      })
    }

    const otp = generateOtpCode()

    await otps.updateOne(
      { email },
      {
        $set: {
          email,
          otpHash: hashOtp(email, otp),
          attempts: 0,
          verified: false,
          verifiedAt: null,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          resendAvailableAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    )

    await sendRegistrationOtpEmail(email, otp)

    return res.json({
      message: 'OTP sent to your email',
      expiresInMinutes: OTP_EXPIRY_MINUTES,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to send OTP' })
  }
})

// Verify registration OTP
router.post('/user/register/verify-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const otp = String(req.body?.otp || '').trim()

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' })
    }

    const otps = getEmailOtpsCollection()
    const record = await otps.findOne({ email })

    if (!record) {
      return res.status(400).json({ message: 'No OTP request found for this email' })
    }

    if (record.verified) {
      return res.json({ message: 'Email already verified', verified: true })
    }

    if (!record.expiresAt || new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP' })
    }

    if ((record.attempts || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many failed attempts. Request a new OTP' })
    }

    const incomingHash = hashOtp(email, otp)
    if (incomingHash !== record.otpHash) {
      const nextAttempts = (record.attempts || 0) + 1
      await otps.updateOne(
        { email },
        {
          $set: { attempts: nextAttempts, updatedAt: new Date() },
        },
      )

      if (nextAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        return res.status(429).json({ message: 'Too many failed attempts. Request a new OTP' })
      }

      return res.status(400).json({
        message: 'Invalid OTP',
        remainingAttempts: OTP_MAX_VERIFY_ATTEMPTS - nextAttempts,
      })
    }

    await otps.updateOne(
      { email },
      {
        $set: {
          verified: true,
          verifiedAt: new Date(),
          attempts: 0,
          updatedAt: new Date(),
        },
      },
    )

    return res.json({ message: 'Email verified successfully', verified: true })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'OTP verification failed' })
  }
})

// User Register
router.post('/user/register', async (req, res) => {
  try {
    const { name, email, hostelAndRoom, mobileNumber, year, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!name || !normalizedEmail || !hostelAndRoom || !mobileNumber || !year || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const users = getUsersCollection()
    const existing = await users.findOne({ email: normalizedEmail })

    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    const otps = getEmailOtpsCollection()
    const otpVerification = await otps.findOne({ email: normalizedEmail, verified: true })

    if (!otpVerification || !otpVerification.expiresAt || new Date(otpVerification.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Please verify your email with OTP before registration' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString('hex')

    const result = await users.insertOne({
      name: name.trim(),
      email: normalizedEmail,
      hostelAndRoom: hostelAndRoom.trim(),
      mobileNumber: String(mobileNumber).trim(),
      year: String(year).trim(),
      password: hashedPassword,
      sessionToken: token,
      createdAt: new Date(),
    })

    await otps.deleteOne({ email: normalizedEmail })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.insertedId, name, email: normalizedEmail },
    })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Registration failed' })
  }
})

// User Login
router.post('/user/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const users = getUsersCollection()
    const user = await users.findOne({ email: normalizedEmail })

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

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
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
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid order id' })
    const order = await orders.findOne({ _id: new ObjectId(id), userId: req.user._id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    return res.json({ order })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.delete('/user/orders/:id', requireUser, async (req, res) => {
  try {
    const orders = getOrdersCollection()
    const foodItems = getFoodItemsCollection()
    const { id } = req.params

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id' })
    }

    const orderId = new ObjectId(id)
    const order = await orders.findOne({ _id: orderId, userId: req.user._id })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' })
    }

    for (const item of order.items || []) {
      const itemId = item?.itemId
      if (!itemId || !ObjectId.isValid(itemId)) {
        continue
      }

      const restoreQuantity = Math.max(1, parseInt(item.qty, 10) || 1)
      await foodItems.updateOne(
        { _id: new ObjectId(itemId) },
        {
          $inc: { quantity: restoreQuantity },
          $set: { updatedAt: new Date() },
        },
      )
    }

    await orders.deleteOne({ _id: orderId, userId: req.user._id })
    return res.status(204).send()
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to cancel order' })
  }
})

export default router
