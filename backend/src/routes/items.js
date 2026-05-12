import { Router } from 'express'
import { ObjectId } from 'mongodb'
import { requireAdmin } from '../middleware/adminAuth.js'
import { getFoodItemsCollection } from '../mongoClient.js'

const router = Router()

router.get('/items', async (_req, res) => {
  try {
    const foodItems = getFoodItemsCollection()
    const items = await foodItems
      .find({
        $or: [
          { isAvailable: true },
          { isAvailable: { $exists: false } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray()

    return res.json({ items })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/admin/items', requireAdmin, async (_req, res) => {
  try {
    const foodItems = getFoodItemsCollection()
    const items = await foodItems
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return res.json({ items })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.post('/admin/items', requireAdmin, async (req, res) => {
  try {
    const body = req.body ?? {}
    const name = body.name ?? body.itemName ?? body.title ?? ''
    const description = body.description ?? body.details ?? ''
    const price = body.price ?? body.itemPrice ?? body.amount ?? ''
    const imageUrl = body.imageUrl ?? body.image_url ?? body.image ?? ''
    const quantity = body.quantity ?? 0
    const isAvailable = body.isAvailable ?? true
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

    if (numericPrice < 0) {
      return res.status(400).json({ message: 'Price must be non-negative' })
    }

    const foodItems = getFoodItemsCollection()
    const result = await foodItems.insertOne({
      name: trimmedName,
      description: description?.trim() || null,
      price: numericPrice,
      quantity: numericQuantity,
      imageUrl: imageUrl?.trim() || null,
      isAvailable: Boolean(isAvailable),
      createdAt: new Date(),
    })

    const item = await foodItems.findOne({ _id: result.insertedId })
    return res.status(201).json({ item })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

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

router.delete('/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const foodItems = getFoodItemsCollection()
    
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid item ID' })
    }

    const result = await foodItems.deleteOne({ _id: new ObjectId(req.params.id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' })
    }

    return res.status(204).send()
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

export default router
