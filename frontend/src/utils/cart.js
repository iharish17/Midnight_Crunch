const CART_STORAGE_KEY = 'midnightCrunchCart'

function safeParse(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function readCart() {
  return safeParse(localStorage.getItem(CART_STORAGE_KEY) || '[]')
}

export function writeCart(cartItems) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  window.dispatchEvent(new Event('cart-updated'))
}

export function getCartCount(cartItems = readCart()) {
  return cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
}

export function addToCart(item, qty) {
  const cart = readCart()
  const itemId = item._id || item.id
  const availableQuantity = Math.max(0, Number(item.quantity) || 0)
  const normalizedQty = Math.max(1, Math.min(Number(qty) || 1, availableQuantity || 1))
  const existingIndex = cart.findIndex((entry) => entry.itemId === itemId)

  let nextCart
  if (existingIndex === -1) {
    nextCart = [
      ...cart,
      {
        itemId,
        name: item.name,
        price: Number(item.price) || 0,
        imageUrl: item.image_url || item.imageUrl || '',
        qty: normalizedQty,
        availableQuantity,
      },
    ]
  } else {
    nextCart = cart.map((entry, index) => {
      if (index !== existingIndex) return entry

      return {
        ...entry,
        qty: Math.min((Number(entry.qty) || 0) + normalizedQty, availableQuantity || normalizedQty),
        availableQuantity,
      }
    })
  }

  writeCart(nextCart)
  return nextCart
}

export function updateCartItemQty(itemId, delta) {
  const cart = readCart()
  const nextCart = cart
    .map((entry) => {
      if (entry.itemId !== itemId) return entry

      const availableQuantity = Math.max(0, Number(entry.availableQuantity) || 0)
      const nextQty = Math.max(0, Math.min((Number(entry.qty) || 0) + delta, availableQuantity || Number(entry.qty) || 0))

      return {
        ...entry,
        qty: nextQty,
      }
    })
    .filter((entry) => entry.qty > 0)

  writeCart(nextCart)
  return nextCart
}

export function removeCartItem(itemId) {
  const nextCart = readCart().filter((entry) => entry.itemId !== itemId)
  writeCart(nextCart)
  return nextCart
}

export function clearCart() {
  writeCart([])
}
