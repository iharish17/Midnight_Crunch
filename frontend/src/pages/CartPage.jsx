import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { createUserOrder } from '../api'
import Navbar from '../components/Navbar'
import { showError, showSuccess } from '../utils/toast'
import { clearCart, getCartCount, readCart, removeCartItem, updateCartItemQty } from '../utils/cart'
import '../App.css'
import './CartPage.css'

function CartPage() {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState(() => readCart())
  const [isOrdering, setIsOrdering] = useState(false)
  const [isLoggedIn] = useState(() => !!localStorage.getItem('userToken'))
  const [isAdminLoggedIn] = useState(() => !!localStorage.getItem('adminToken'))

  useEffect(() => {
    function syncCart() {
      setCartItems(readCart())
    }

    window.addEventListener('cart-updated', syncCart)
    window.addEventListener('storage', syncCart)

    return () => {
      window.removeEventListener('cart-updated', syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [])

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * (item.qty || 0), 0),
    [cartItems],
  )

  const cartCount = getCartCount(cartItems)
  const cartLabel = `${String(cartCount).padStart(2, '0')} items`

  function refreshCart(nextCart) {
    setCartItems(nextCart)
  }

  function handleRemove(itemId) {
    refreshCart(removeCartItem(itemId))
  }

  function handleQuantity(itemId, delta) {
    refreshCart(updateCartItemQty(itemId, delta))
  }

  async function handlePlaceOrder() {
    if (cartItems.length === 0) {
      showError('Your cart is empty')
      return
    }

    const token = localStorage.getItem('userToken')
    if (!token) {
      showError('Please login as a customer to place an order')
      navigate('/login')
      return
    }

    const confirmed = window.confirm(`Place order for ${cartLabel} worth Rs. ${cartTotal.toFixed(2)}?`)
    if (!confirmed) {
      return
    }

    try {
      setIsOrdering(true)
      await createUserOrder(
        token,
        cartItems.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          price: Number(item.price),
          qty: item.qty,
          imageUrl: item.imageUrl,
        })),
      )
      clearCart()
      setCartItems([])
      showSuccess('Order placed successfully')
      navigate('/profile')
    } catch (error) {
      showError(error.message || 'Unable to place order')
    } finally {
      setIsOrdering(false)
    }
  }

  return (
    <main className="page-shell">
      <Navbar userLoggedIn={isLoggedIn} adminLoggedIn={isAdminLoggedIn} />
      <section className="cart-page">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Your cart</p>
            <h2>{cartLabel}</h2>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={30} />
            <h3>Your cart is empty</h3>
            <p>Add items from the menu to start ordering.</p>
          </div>
        ) : (
          <div className="cart-page-layout">
            <div className="cart-list-simple">
              {cartItems.map((item) => (
                <div className="cart-line-item" key={item.itemId}>
                  <div className="cart-line-main">
                    <strong>{item.name}</strong>
                    <small>Rs. {Number(item.price).toFixed(2)} each</small>
                  </div>
                  <div className="cart-line-actions">
                    <div className="order-qty-stepper" role="group" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        className="order-qty-btn"
                        onClick={() => handleQuantity(item.itemId, -1)}
                        disabled={isOrdering || item.qty <= 1}
                      >
                        -
                      </button>
                      <span className="order-qty-value">{item.qty}</span>
                      <button
                        type="button"
                        className="order-qty-btn"
                        onClick={() => handleQuantity(item.itemId, 1)}
                        disabled={isOrdering || item.qty >= item.availableQuantity}
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="cart-remove-btn" onClick={() => handleRemove(item.itemId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="cart-summary-simple">
              <div className="order-summary-row total-row">
                <span>Total payable</span>
                <strong>Rs. {cartTotal.toFixed(2)}</strong>
              </div>
              <button type="button" className="primary-order-btn cart-place-btn" onClick={handlePlaceOrder} disabled={isOrdering}>
                {isOrdering ? 'Placing Order...' : 'Place Order'}
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

export default CartPage