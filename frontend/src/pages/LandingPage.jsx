import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Clock3,
  MapPin,
  ShoppingBag,
} from 'lucide-react'
import { getFoodItems } from '../api'
import heroImage from '../assets/midnight-feast-hero.png'
import Navbar from '../components/Navbar'
import { showError, showSuccess } from '../utils/toast'
import { addToCart } from '../utils/cart'
import '../App.css'

function LandingPage() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggedIn] = useState(() => !!localStorage.getItem('userToken'))
  const [isAdminLoggedIn] = useState(() => !!localStorage.getItem('adminToken'))
  const [activeItem, setActiveItem] = useState(null)
  const [orderQuantity, setOrderQuantity] = useState(1)

  useEffect(() => {
    getFoodItems()
      .then((data) => {
        console.log('API Response:', data)
        const itemsList = Array.isArray(data) ? data : (data.items || [])
        setItems(itemsList)
        setError('')
      })
      .catch((requestError) => {
        setError(requestError.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  function openOrderModal(item) {
    if (isAdminLoggedIn) {
      showError('Admin accounts cannot place customer orders')
      return
    }

    if (!isLoggedIn) {
      showError('Please login as a customer to place an order')
      return
    }

    setActiveItem(item)
    setOrderQuantity(1)
  }

  function addItemToCart() {
    if (!activeItem) return

    const availableQuantity = Math.max(0, Number(activeItem.quantity) || 0)
    const normalizedQuantity = Math.max(1, Math.min(parseInt(orderQuantity, 10) || 1, availableQuantity || 1))

    addToCart(activeItem, normalizedQuantity)

    showSuccess(`${activeItem.name} added to cart (x${normalizedQuantity})`)
    setActiveItem(null)
    setOrderQuantity(1)
  }

  const unitPrice = Number(activeItem?.price) || 0
  const maxQuantity = Math.max(1, Number(activeItem?.quantity) || 1)
  const clampedQuantity = Math.max(1, Math.min(parseInt(orderQuantity, 10) || 1, maxQuantity))
  const totalPayable = unitPrice * clampedQuantity

  function adjustOrderQuantity(delta) {
    if (!activeItem) return

    setOrderQuantity((current) => {
      const currentValue = Math.max(1, Math.min(parseInt(current, 10) || 1, maxQuantity))
      return Math.max(1, Math.min(currentValue + delta, maxQuantity))
    })
  }

  return (
    <main className="page-shell">
      <Navbar
        userLoggedIn={isLoggedIn}
        adminLoggedIn={isAdminLoggedIn}
      />

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <Clock3 size={18} />
            Hostel-only ordering till 10:30 PM
          </p>
          <h1>Food for late nights, delivered straight to your room.</h1>
          <p className="hero-text">
            Order your favourite one here, you want to eat today.
          </p>

          <form className="order-search" aria-label="Find your hostel">
            <MapPin size={20} />
            <input type="text" placeholder="Enter your room number" />
            <button type="button" >
              Start order
              <ArrowRight size={18} />
            </button>
          </form>

        </div>

        <div className="hero-media" aria-label="Featured midnight meal">
          <img src={heroImage} alt="Burger, fries, sauce, and drink for hostel room delivery" />
        </div>
      </section>

      <section className="food-items-section" id="menu" aria-label="Food items">
        <div className="section-heading">
          <p className="eyebrow">Food items</p>
        </div>
        {isLoading && (
          <div className="empty-state">
            <div className="loading-spinner-small" />
            <h3>Loading food items...</h3>
            <p>Please wait while admin-added items are fetched.</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="empty-state">
            <ShoppingBag size={28} />
            <h3>Unable to load food items!</h3>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="empty-state">
            <ShoppingBag size={28} />
            <h3>No food items added yet</h3>
            <p>Admin-added food items will show here for hostellers to order.</p>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="food-items-grid">
            {items.map((item) => (
              <article className="food-card" key={item._id || item.id}>
                {(item.image_url || item.imageUrl) && (
                  <img src={item.image_url || item.imageUrl} alt={item.name} />
                )}
                <span>
                  {item.quantity > 0 
                    ? `${item.quantity} available` 
                    : 'Out of stock'}
                </span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div>
                  <strong>Rs. {Number(item.price).toFixed(2)}</strong>
                  <button
                    type="button"
                    onClick={() => openOrderModal(item)}
                    aria-label={`Add ${item.name} to cart`}
                    disabled={item.quantity <= 0}
                  >
                    {item.quantity > 0 ? 'Add to Cart' : 'Unavailable'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activeItem && (
        <div className="order-modal-backdrop" role="presentation" onClick={() => setActiveItem(null)}>
          <div
            className="order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="order-modal-header">
              <div>
                <p className="eyebrow">Confirm order</p>
                <h3 id="order-modal-title">Add {activeItem.name} to cart?</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveItem(null)}>
                <ShoppingBag size={18} />
              </button>
            </div>

            <div className="order-modal-body">
              <p>{activeItem.description}</p>
              <div className="order-summary-row">
                <span>Item price</span>
                <strong>Rs. {unitPrice.toFixed(2)}</strong>
              </div>
              <div className="order-summary-row">
                <span>Quantity</span>
                <div className="order-quantity-control">
                  <div className="order-qty-stepper" role="group" aria-label="Order quantity">
                    <button
                      type="button"
                      className="order-qty-btn"
                      onClick={() => adjustOrderQuantity(-1)}
                      disabled={clampedQuantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="order-qty-value" aria-live="polite">
                      {clampedQuantity}
                    </span>
                    <button
                      type="button"
                      className="order-qty-btn"
                      onClick={() => adjustOrderQuantity(1)}
                      disabled={clampedQuantity >= maxQuantity}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <small>Available: {activeItem.quantity || 0}</small>
                </div>
              </div>
              <div className="order-summary-row total-row">
                <span>Total payable</span>
                <strong>Rs. {totalPayable.toFixed(2)}</strong>
              </div>
              <p className="order-note">This order will go directly to admin with your account and room details.</p>
            </div>

            <div className="order-modal-actions">
              <button type="button" className="secondary-order-btn" onClick={() => setActiveItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary-order-btn" onClick={addItemToCart}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default LandingPage
