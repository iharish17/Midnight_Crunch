import { getUsersCollection } from '../mongoClient.js'

export async function requireUser(req, res, next) {
  try {
    const authHeader = req.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'User login required' })
    }

    const users = getUsersCollection()
    const user = await users.findOne({ sessionToken: token })

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (err) {
    res.status(500).json({ message: err.message || 'Authentication error' })
  }
}

export default requireUser
