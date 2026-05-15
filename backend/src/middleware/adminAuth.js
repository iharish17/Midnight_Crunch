import { getAdminsCollection } from '../mongoClient.js'

const ADMIN_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getActiveAdminSession(admin, token, now) {
  const sessions = Array.isArray(admin?.sessions) ? admin.sessions : []
  const sessionMatch = sessions.find((session) => {
    if (!session || session.token !== token) {
      return false
    }

    return new Date(session.expiresAt).getTime() > now.getTime()
  })

  if (sessionMatch) {
    return { type: 'session', session: sessionMatch }
  }

  if (admin?.sessionToken === token && new Date(admin.sessionTokenExpiry).getTime() > now.getTime()) {
    return { type: 'legacy' }
  }

  return null
}

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'Admin login required' })
    }

    const admins = getAdminsCollection()
    const now = new Date()
    const admin = await admins.findOne({
      $or: [
        { sessions: { $elemMatch: { token, expiresAt: { $gt: now } } } },
        { sessionToken: token, sessionTokenExpiry: { $gt: now } },
      ],
    })

    if (!admin) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    // Sliding session window: keep active sessions alive for up to 30 days from last activity.
    const renewedExpiry = new Date(Date.now() + ADMIN_SESSION_TTL_MS)
    const activeSession = getActiveAdminSession(admin, token, now)

    if (activeSession?.type === 'session') {
      await admins.updateOne(
        { _id: admin._id, 'sessions.token': token },
        { $set: { 'sessions.$.expiresAt': renewedExpiry, 'sessions.$.lastSeenAt': now, lastSeenAt: now } },
      )
    } else {
      await admins.updateOne(
        { _id: admin._id },
        { $set: { sessionTokenExpiry: renewedExpiry, lastSeenAt: now } },
      )
    }

    req.admin = { ...admin, sessionTokenExpiry: renewedExpiry }
    next()
  } catch (err) {
    res.status(500).json({ message: err.message || 'Authentication error' })
  }
}
