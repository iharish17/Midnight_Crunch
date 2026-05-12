import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Clock3,
  MapPin,
  ShoppingBag,
} from 'lucide-react'
import { createUserOrder, getFoodItems } from '../api'
import heroImage from '../assets/midnight-feast-hero.png'
import Navbar from '../components/Navbar'
import { showError, showSuccess } from '../utils/toast'
import '../App.css'

function LandingPage() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggedIn] = useState(() => !!localStorage.getItem('userToken'))
  const [isAdminLoggedIn] = useState(() => !!localStorage.getItem('adminToken'))
  const [activeItem, setActiveItem] = useState(null)
  const [isOrdering, setIsOrdering] = useState(false)

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
  }

  async function confirmOrder() {
    if (!activeItem) return

    const token = localStorage.getItem('userToken')
    if (!token) {
      showError('Please login as a customer to place an order')
      return
    }

    try {
      setIsOrdering(true)
      await createUserOrder(token, [
        {
          itemId: activeItem._id || activeItem.id,
          name: activeItem.name,
          price: Number(activeItem.price),
          qty: 1,
          imageUrl: activeItem.image_url || activeItem.imageUrl || '',
        },
      ])
      showSuccess(`Order placed for ${activeItem.name}. Admin has been notified.`)
      setActiveItem(null)
      // Refetch items to show updated quantity immediately
      const updatedData = await getFoodItems()
      const itemsList = Array.isArray(updatedData) ? updatedData : (updatedData.items || [])
      setItems(itemsList)
    } catch (orderError) {
      showError(orderError.message || 'Unable to place order')
    } finally {
      setIsOrdering(false)
    }
  }

  return (
    <main className="page-shell">
      <Navbar userLoggedIn={isLoggedIn} adminLoggedIn={isAdminLoggedIn} />

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <Clock3 size={18} />
            Hostel-only ordering till 12 AM
          </p>
          <h1>Food for hostel nights, delivered straight to your room.</h1>
          <p className="hero-text">
            Order snacks, meals, drinks, and exam-night cravings from campus
            counters without leaving your block.
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
                    aria-label={`Order ${item.name}`}
                    disabled={item.quantity <= 0}
                  >
                    {item.quantity > 0 ? 'Order' : 'Unavailable'}
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
                <h3 id="order-modal-title">Place {activeItem.name}?</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveItem(null)}>
                <ShoppingBag size={18} />
              </button>
            </div>

            <div className="order-modal-body">
              <p>{activeItem.description}</p>
              <div className="order-summary-row">
                <span>Item price</span>
                <strong>Rs. {Number(activeItem.price).toFixed(2)}</strong>
              </div>
              <div className="order-summary-row total-row">
                <span>Total payable</span>
                <strong>Rs. {Number(activeItem.price).toFixed(2)}</strong>
              </div>
              <p className="order-note">This order will go directly to admin with your account and room details.</p>
            </div>

            <div className="order-modal-actions">
              <button type="button" className="secondary-order-btn" onClick={() => setActiveItem(null)}>
                Cancel
              </button>
              <button type="button" className="primary-order-btn" onClick={confirmOrder} disabled={isOrdering}>
                {isOrdering ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default LandingPage
