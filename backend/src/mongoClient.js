import { MongoClient } from 'mongodb'

let client
let db
let adminsCollection
let usersCollection
let foodItemsCollection
let ordersCollection

export async function initMongo() {
  try {
    // Use IPv4 to avoid localhost (::1) issues
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'

    // ❌ Removed deprecated options
    client = new MongoClient(uri)

    await client.connect()

    db = client.db('midnight_crunch')

    adminsCollection = db.collection('admins')
    usersCollection = db.collection('users')
    foodItemsCollection = db.collection('food_items')
    ordersCollection = db.collection('orders')

    // ✅ Create indexes
    await adminsCollection.createIndex({ email: 1 }, { unique: true })
    await usersCollection.createIndex({ email: 1 }, { unique: true })
    await foodItemsCollection.createIndex({ createdAt: -1 })
    await ordersCollection.createIndex({ userId: 1 })
    await ordersCollection.createIndex({ createdAt: -1 })

    console.log('✅ MongoDB connected and initialized')
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)
    throw error
  }
}

// ✅ Get collections safely
export function getAdminsCollection() {
  if (!adminsCollection) throw new Error('MongoDB not initialized')
  return adminsCollection
}

export function getUsersCollection() {
  if (!usersCollection) throw new Error('MongoDB not initialized')
  return usersCollection
}

export function getFoodItemsCollection() {
  if (!foodItemsCollection) throw new Error('MongoDB not initialized')
  return foodItemsCollection
}

export function getOrdersCollection() {
  if (!ordersCollection) throw new Error('MongoDB not initialized')
  return ordersCollection
}

// ✅ Close connection (graceful shutdown)
export async function closeMongo() {
  try {
    if (client) {
      await client.close()
      console.log('🔌 MongoDB connection closed')
    }
  } catch (error) {
    console.error('Error closing MongoDB:', error.message)
  }
}