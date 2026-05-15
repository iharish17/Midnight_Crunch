import {
  ReceiptText,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cancelUserOrder, getUserProfile, getUserOrders, getUserOrder } from '../api'
import { showError, showSuccess } from '../utils/toast'
import Navbar from '../components/Navbar'
import '../App.css'

const orderSteps = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
]

function getStepState(currentStatus, stepKey) {
  const order = ['pending', 'confirmed', 'packed', 'on_the_way', 'delivered']
  const currentIndex = order.indexOf(currentStatus)
  const stepIndex = order.indexOf(stepKey)
  return stepIndex !== -1 && currentIndex >= stepIndex ? 'done' : ''
}

function ProfilePage() {
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCancellingOrder, setIsCancellingOrder] = useState(false)
  const [isLoggedIn] = useState(() => !!localStorage.getItem('userToken'))

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    if (!token) {
      setIsLoading(false)
      return
    }

    Promise.all([getUserProfile(token), getUserOrders(token)])
      .then(([profileRes, ordersRes]) => {
        setUser(profileRes.user)
        setOrders(ordersRes.orders || [])
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleTrack(orderId) {
    setMessage('')
    const token = localStorage.getItem('userToken')
    if (!token) return setMessage('Not authenticated')

    try {
      const res = await getUserOrder(token, orderId)
      setSelectedOrder(res.order)
    } catch (err) {
      setMessage(err.message)
    }
  }

  function closeOrderModal() {
    setSelectedOrder(null)
  }

  async function handleCancelOrder(orderId) {
    const token = localStorage.getItem('userToken')
    if (!token) {
      showError('Please login again')
      return
    }

    try {
      setIsCancellingOrder(true)
      await cancelUserOrder(token, orderId)
      setOrders((current) => current.filter((order) => order._id !== orderId))
      setSelectedOrder(null)
      showSuccess('Order cancelled successfully')
    } catch (error) {
      showError(error.message || 'Unable to cancel order')
    } finally {
      setIsCancellingOrder(false)
    }
  }

  function getOrderTitle(order) {
    if (!order?.items?.length) return `Order ${order?._id || ''}`
    if (order.items.length === 1) return order.items[0].name
    return `${order.items[0].name} + ${order.items.length - 1} more`
  }

  function getOrderTotal(order) {
    if (typeof order?.total === 'number') return order.total
    return (order?.items || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (item.qty || 1), 0)
  }

  return (
    <>
      <Navbar userLoggedIn={isLoggedIn} />
      <main className="profile-page">
      <header className="profile-header">
        <div className="profile-greeting">
          <p className="eyebrow">My profile</p>
          <h1>{user ? `Hello, ${user.name}` : 'Hello, hosteller'}</h1>
        </div>
        <aside className="hosteller-card">
          <span>
            <UserRound size={24} />
          </span>
          <h2>{user ? user.name : 'No hosteller loaded'}</h2>
          <p>{user ? user.email : 'Login to display profile details'}</p>
          <small>{user ? user.hostelAndRoom : 'Profile data will come from your backend.'}</small>
        </aside>
      </header>

      <section className="orders-layout">
        <div className="orders-list" aria-label="My orders">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">My orders</p>
              <h2>{orders.length ? 'Recent orders' : 'Orders will appear here.'}</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state" aria-label="Loading profile data">
              <div className="loading-spinner-small" />
              <h3>Loading your orders...</h3>
              <p>Please wait while we fetch your order history.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <ReceiptText size={30} />
              <h3>No orders found</h3>
              <p>Once a hosteller places an order, it will show in this list.</p>
            </div>
          ) : (
            orders.map((order) => (
              <button
                className={`order-item ${selectedOrder?._id === order._id ? 'active' : ''}`}
                key={order._id}
                type="button"
                onClick={() => handleTrack(order._id)}
              >
                <div className="order-item-main">
                  <strong className="order-item-id">Order #{String(order._id).slice(-6)}</strong>
                  <small className="order-item-date">{new Date(order.createdAt).toLocaleString()}</small>
                </div>
                <div className="order-meta">
                  <span className="order-item-title">{getOrderTitle(order)}</span>
                  <small>Rs. {getOrderTotal(order).toFixed(2)}</small>
                </div>
                <div className="order-item-status">
                  <span className="order-status-pill">Status: {String(order.status).replaceAll('_', ' ')}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedOrder && (
        <div className="order-modal-backdrop" role="presentation" onClick={closeOrderModal}>
          <div
            className="order-modal order-modal-profile"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-order-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="order-modal-header">
              <div>
                <p className="eyebrow">Order tracking</p>
                <h3 id="profile-order-modal-title">{getOrderTitle(selectedOrder)}</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeOrderModal}>
                <X size={18} />
              </button>
            </div>

            <div className="order-modal-body">
              <div className="order-summary-row">
                <span>Price</span>
                <strong>Rs. {getOrderTotal(selectedOrder).toFixed(2)}</strong>
              </div>
              <div className="order-summary-row">
                <span>Status</span>
                <strong>{String(selectedOrder.status).replaceAll('_', ' ')}</strong>
              </div>

              <div className="timeline timeline-modal" aria-label="Order progress">
                {orderSteps.map((step) => (
                  <div className={`timeline-step ${getStepState(selectedOrder.status, step.key)}`} key={step.key}>
                    <span>{orderSteps.findIndex((entry) => entry.key === step.key) + 1}</span>
                    <p>{step.label}</p>
                  </div>
                ))}
              </div>

              <div className="order-details">
                <h3>Items</h3>
                <ul>
                  {selectedOrder.items.map((it, i) => (
                    <li key={i}>
                      {it.name} × {it.qty || 1} — Rs. {Number(it.price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="order-modal-actions">
              <button type="button" className="secondary-order-btn" onClick={closeOrderModal}>
                Close
              </button>
              {selectedOrder.status === 'pending' && (
                <button
                  type="button"
                  className="primary-order-btn"
                  onClick={() => handleCancelOrder(selectedOrder._id)}
                  disabled={isCancellingOrder}
                >
                  {isCancellingOrder ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {message && <p className="admin-message">{message}</p>}
      </main>
    </>
  )
}

export default ProfilePage
