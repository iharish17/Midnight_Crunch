import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { adminLogin, adminRegister, checkAdminExists } from '../api'
import AdminDashboard from '../components/AdminDashboard'
import Navbar from '../components/Navbar'
import { showSuccess, showError } from '../utils/toast'
import '../styles/admin-dashboard.css'
import '../App.css'

function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adminExists, setAdminExists] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    checkAdminExists()
      .then((data) => setAdminExists(data.adminExists))
      .catch(() => setAdminExists(false))
      .finally(() => setCheckingAdmin(false))
  }, [])

  function handleAuthSubmit(event) {
    event.preventDefault()
    setLoading(true)

    const authRequest = isRegisterMode ? adminRegister : adminLogin

    authRequest(authForm)
      .then((data) => {
        localStorage.setItem('adminToken', data.token)
        setToken(data.token)
        setAuthForm({ email: '', password: '' })
        showSuccess(isRegisterMode ? 'Admin registered successfully!' : 'Admin login successful!')
      })
      .catch((error) => {
        showError(error.message || 'Authentication failed')
      })
      .finally(() => setLoading(false))
  }

  function handleLogout() {
    localStorage.removeItem('adminToken')
    setToken('')
    showSuccess('Logged out successfully')
  }

  if (checkingAdmin) {
    return (
      <main className="admin-page">
        <Navbar />
        <div className="loading-state">
          <div className="loading-spinner" />
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <Navbar adminLoggedIn={!!token} />
      {!token ? (
        <section className="admin-auth-section">
          <div className="auth-container">
            <div className="auth-card admin-auth-card">
              <div className="auth-heading">
                <h1>{isRegisterMode && !adminExists ? 'Create Admin Account' : 'Admin Login'}</h1>
                <p>Access the admin panel to manage orders and food items</p>
              </div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="admin-email">Admin Email</label>
                  <div className="admin-input-field">
                    <input
                      id="admin-email"
                      type="email"
                      placeholder="Enter admin email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-password">Password</label>
                  <div className="admin-input-field admin-input-field--password">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password (min 6 characters)"
                      value={authForm.password}
                      onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-auth-submit" disabled={loading}>
                  {loading ? 'Processing...' : isRegisterMode && !adminExists ? 'Create Admin' : 'Login'}
                </button>
              </form>

              {!adminExists && (
                <div className="auth-toggle">
                  <p>{isRegisterMode ? 'Already an admin?' : 'New admin?'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode)
                      setAuthForm({ email: '', password: '' })
                    }}
                    className="btn-toggle"
                  >
                    {isRegisterMode ? 'Login Instead' : 'Create Account'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <AdminDashboard token={token} onLogout={handleLogout} />
      )}
    </main>
  )
}

export default AdminPage
