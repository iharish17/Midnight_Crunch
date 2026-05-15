const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api'

async function request(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
    ...restOptions,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    const requestError = new Error(error.message || 'Request failed')
    requestError.status = response.status
    throw requestError
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Food Items
export function getFoodItems() {
  return request('/items')
}

// Admin Authentication
export function adminLogin(credentials) {
  return request('/admin/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function adminRegister(credentials) {
  return request('/admin/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function checkAdminExists() {
  return request('/admin/check-exists')
}

// User Authentication
export function userRegister(data) {
  return request('/user/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function userLogin(credentials) {
  return request('/user/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function getUserProfile(token) {
  return request('/user/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getUserOrders(token) {
  return request('/user/orders', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createUserOrder(token, items) {
  return request('/user/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  })
}

export function getUserOrder(token, id) {
  return request(`/user/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function cancelUserOrder(token, id) {
  return request(`/user/orders/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// Admin Operations
export function getAdminFoodItems(token) {
  return request('/admin/items', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function getAdminOrders(token) {
  return request('/admin/orders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function createFoodItem(token, item) {
  return request('/admin/items', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  })
}

export function deleteFoodItem(token, id) {
  return request(`/admin/items/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function updateOrderStatus(token, id, status) {
  return request(`/admin/orders/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })
}

export function updateItemQuantity(token, id, quantity) {
  return request(`/admin/items/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  })
}
