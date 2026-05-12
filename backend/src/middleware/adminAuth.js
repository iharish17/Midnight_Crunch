import { getAdminsCollection } from '../mongoClient.js'

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'Admin login required' })
    }

    const admins = getAdminsCollection()
    const admin = await admins.findOne({ sessionToken: token })

    if (!admin) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    req.admin = admin
    next()
  } catch (err) {
    res.status(500).json({ message: err.message || 'Authentication error' })
  }
}
