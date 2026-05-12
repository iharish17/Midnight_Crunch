import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { initMongo, closeMongo } from './mongoClient.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import itemRoutes from './routes/items.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

function normalizeOrigins(value) {
  if (!value) return []

  try {
    return [new URL(value).origin]
  } catch {
    const host = value.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return [`https://${host}`, `http://${host}`]
  }
}

const allowedFrontendOrigins = new Set([
  ...normalizeOrigins(process.env.FRONTEND_ORIGIN),
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like curl, mobile apps, or server-to-server)
      if (!origin) return callback(null, true)
      if (allowedFrontendOrigins.has(origin)) return callback(null, true)
      return callback(new Error('CORS not allowed'))
    },
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', adminRoutes)
app.use('/api', userRoutes)
app.use('/api', itemRoutes)

app.use((err, _req, res, _next) => {
  res.status(500).json({ message: err.message || 'Server error' })
})

// Initialize MongoDB and start server
async function start() {
  try {
    await initMongo()
    app.listen(port, () => {
      console.log(`Backend running on ${port}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  await closeMongo()
  process.exit(0)
})

start()
