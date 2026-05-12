import { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, RefreshCw } from 'lucide-react'
import { getAdminOrders, getAdminFoodItems, createFoodItem, deleteFoodItem, updateOrderStatus, updateItemQuantity } from '../api'
import { showSuccess, showError } from '../utils/toast'
import '../styles/admin-dashboard.css'
import '../App.css'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  quantity: '',
  imageUrl: '',
}

const orderStatusFlow = ['pending', 'confirmed', 'packed', 'on_the_way', 'delivered']

function getNextOrderStatus(currentStatus) {
  const currentIndex = orderStatusFlow.indexOf(currentStatus)
  if (currentIndex === -1 || currentIndex >= orderStatusFlow.length - 1) {
    return null
  }

  return orderStatusFlow[currentIndex + 1]
}

function formatStatusLabel(status) {
  return String(status || '').replaceAll('_', ' ')
}

function getOrderUnits(order) {
  return (order?.items || []).reduce((sum, item) => sum + (parseInt(item.qty, 10) || 1), 0)
}

function AdminDashboard({ token, onLogout }) {
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [itemForm, setItemForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')
  const [filterStatus, setFilterStatus] = useState('all')
  const [statusDrafts, setStatusDrafts] = useState({})
  const [itemToDelete, setItemToDelete] = useState(null)
  const [editingQuantityId, setEditingQuantityId] = useState(null)
  const [quantityDraft, setQuantityDraft] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [ordersData, itemsData] = await Promise.all([getAdminOrders(token), getAdminFoodItems(token)])
      setOrders(ordersData.orders || [])
      setItems(itemsData.items || [])
    } catch (error) {
      showError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadData])

  async function handleAddItem(e) {
    e.preventDefault()
    const normalizedName = itemForm.name.trim()
    const normalizedPrice = itemForm.price.toString().trim()
    const normalizedQuantity = Math.max(0, parseInt(itemForm.quantity) || 0)

    if (!normalizedName || !normalizedPrice) {
      showError('Name and price are required')
      return
    }

    try {
      setLoading(true)
      const result = await createFoodItem(token, {
        name: normalizedName,
        itemName: normalizedName,
        title: normalizedName,
        description: itemForm.description,
        price: Number(normalizedPrice),
        quantity: normalizedQuantity,
        imageUrl: itemForm.imageUrl.trim(),
      })
      setItems([result.item, ...items])
      setItemForm(emptyForm)
      showSuccess('Food item added successfully')
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  function requestDeleteItem(item) {
    setItemToDelete(item)
  }

  async function handleConfirmDeleteItem() {
    if (!itemToDelete?._id) return

    try {
      setLoading(true)
      await deleteFoodItem(token, itemToDelete._id)
      setItems((current) => current.filter((item) => item._id !== itemToDelete._id))
      setItemToDelete(null)
      showSuccess('Item deleted successfully')
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateQuantity(itemId, newQuantity) {
    try {
      setLoading(true)
      const parsedQuantity = Math.max(0, parseInt(newQuantity) || 0)
      const result = await updateItemQuantity(token, itemId, parsedQuantity)
      setItems((current) => current.map((item) => (item._id === itemId ? result.item : item)))
      setEditingQuantityId(null)
      setQuantityDraft('')
      showSuccess('Item quantity updated successfully')
      // Refetch items to ensure UI is in sync
      await loadData()
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateOrderStatus(orderId, newStatus) {
    try {
      setLoading(true)
      const result = await updateOrderStatus(token, orderId, newStatus)
      setOrders(orders.map((o) => (o._id === orderId ? result.order : o)))
      setStatusDrafts((current) => ({ ...current, [orderId]: newStatus }))
      showSuccess(`Order status updated to ${newStatus}`)
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders =
    filterStatus === 'all' ? orders : orders.filter((order) => order.status === filterStatus)

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0)

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p className="header-subtitle">Manage orders and food items</p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value">{filteredOrders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Revenue</span>
          <span className="stat-value">Rs. {totalRevenue.toFixed(2)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Food Items</span>
          <span className="stat-value">{items.length}</span>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Orders
        </button>
        <button
          className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          🍕 Food Items
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="orders-section">
          <div className="section-header">
            <h2>Orders Received</h2>
            <div className="filter-group">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="on_the_way">On the way</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button onClick={loadData} className="refresh-btn" disabled={loading}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="orders-grid">
              {filteredOrders.map((order) => (
                <div className="order-card" key={order._id}>
                  <div className="order-header">
                    <span className="order-id">Order #{order._id?.toString().slice(-6)}</span>
                    <span className={`status-badge status-${order.status}`}>{formatStatusLabel(order.status)}</span>
                  </div>

                  <div className="customer-info">
                    <h3>Customer Details</h3>
                    <p>
                      <strong>Name:</strong> {order.customer?.name || order.customerSnapshot?.name || 'N/A'}
                    </p>
                    <p>
                      <strong>Room:</strong> {order.customer?.hostelAndRoom || order.customerSnapshot?.hostelAndRoom || 'N/A'}
                    </p>
                    <p>
                      <strong>Mobile:</strong> {order.customer?.mobileNumber || order.customerSnapshot?.mobileNumber || 'N/A'}
                    </p>
                    <p>
                      <strong>Year:</strong> {order.customer?.year || order.customerSnapshot?.year || 'N/A'}
                    </p>
                  </div>

                  <div className="order-items">
                    <h4>Items Ordered</h4>
                    <ul>
                      {order.items?.map((item, idx) => (
                        <li key={idx}>
                          {item.name} x {item.qty || 1} - Rs. {(item.price * (item.qty || 1)).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="order-footer">
                    <div className="total">
                      <strong>Total:</strong> Rs. {order.total?.toFixed(2) || '0.00'}
                      <br />
                      <strong>Units:</strong> {getOrderUnits(order)}
                    </div>
                    <div className="status-actions">
                      {(() => {
                        const currentStatus = statusDrafts[order._id] || order.status || 'pending'
                        const nextStatus = getNextOrderStatus(currentStatus)

                        if (!nextStatus) {
                          return <span className="status-final">Order completed</span>
                        }

                        return (
                          <select
                            className="order-status-select"
                            value=""
                            disabled={loading}
                            onChange={(event) => {
                              const selectedStatus = event.target.value
                              if (!selectedStatus) return
                              handleUpdateOrderStatus(order._id, selectedStatus)
                            }}
                          >
                            <option value="">Select to update...</option>
                            <option value={nextStatus}>
                              Move to {formatStatusLabel(nextStatus)}
                            </option>
                          </select>
                        )
                      })()}
                    </div>
                  </div>

                  <small className="order-date">{new Date(order.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="items-section">
          <div className="add-item-form-wrapper">
            <h2>Add Food Item</h2>
            <form className="add-item-form" onSubmit={handleAddItem}>
              <input
                type="text"
                placeholder="Item name"
                value={itemForm.name}
                onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <textarea
                placeholder="Description"
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                rows="3"
              />
              <input
                type="number"
                placeholder="Price (Rs.)"
                step="0.01"
                min="0"
                value={itemForm.price}
                onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
                required
              />
              <input
                type="number"
                placeholder="Quantity available"
                step="1"
                min="0"
                value={itemForm.quantity}
                onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))}
              />
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={itemForm.imageUrl}
                onChange={(e) => setItemForm((p) => ({ ...p, imageUrl: e.target.value }))}
              />
              <button type="submit" className="btn-add-item" disabled={loading}>
                <Plus size={18} /> Add Item
              </button>
            </form>
          </div>

          <h2>Current Food Items</h2>
          {items.length === 0 ? (
            <div className="empty-state">
              <p>No food items added yet</p>
            </div>
          ) : (
            <div className="items-list">
              {items.map((item) => (
                <div className="item-row" key={item._id}>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <span className="item-price">Rs. {Number(item.price).toFixed(2)}</span>
                  </div>
                  <div className="item-quantity">
                    {editingQuantityId === item._id ? (
                      <div className="quantity-edit">
                        <input
                          type="number"
                          min="0"
                          value={quantityDraft}
                          onChange={(e) => setQuantityDraft(e.target.value)}
                          placeholder="Quantity"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item._id, quantityDraft)}
                          className="quantity-save-btn"
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingQuantityId(null)
                            setQuantityDraft('')
                          }}
                          className="quantity-cancel-btn"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="quantity-display">
                        <span className="quantity-label">Qty: {item.quantity || 0}</span>
                        <button
                          onClick={() => {
                            setEditingQuantityId(item._id)
                            setQuantityDraft(String(item.quantity || 0))
                          }}
                          className="quantity-edit-btn"
                          disabled={loading}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => requestDeleteItem(item)}
                    className="btn-delete"
                    disabled={loading}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {itemToDelete && (
        <div
          className="confirm-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!loading) setItemToDelete(null)
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-delete-title">Delete item?</h3>
            <p>
              Are you sure you want to delete <strong>{itemToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-cancel-btn"
                onClick={() => setItemToDelete(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleConfirmDeleteItem}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
