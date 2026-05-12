import { useState } from 'react'
import {
  ChevronDown,
  Menu,
  ReceiptText,
  ShoppingBag,
  UserRound,
  X,
  LogOut,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { showSuccess } from '../utils/toast'

const navItems = ['Menu', 'Deals', 'Reviews']

function getNavHref(item) {
  if (item === 'Deals') return '/deals'
  return `/#${item.toLowerCase().replaceAll(' ', '-')}`
}

function Navbar({ userLoggedIn = false, adminLoggedIn = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const accountMode = adminLoggedIn ? 'admin' : userLoggedIn ? 'user' : 'guest'

  const handleLogout = () => {
    if (adminLoggedIn) {
      localStorage.removeItem('adminToken')
    } else {
      localStorage.removeItem('userToken')
    }

    showSuccess('Logged out successfully')
    setIsMenuOpen(false)
    setTimeout(() => {
      navigate('/')
      window.location.reload()
    }, 800)
  }

  return (
    <header className="navbar" aria-label="Primary navigation">
      <Link className="brand" to="/" aria-label="Hostel Crunch home">
        <span className="brand-mark">
          <ShoppingBag size={22} strokeWidth={2.4} />
        </span>
        <span>Midnight Crunch</span>
      </Link>

      <div className="nav-actions">
        <nav className="nav-links" aria-label="Main menu">
          {navItems.map((item) => (
            item === 'Deals' ? (
              <Link to={getNavHref(item)} key={item}>
                {item}
              </Link>
            ) : (
              <a href={getNavHref(item)} key={item}>
                {item}
              </a>
            )
          ))}
        </nav>

        <details className="profile-menu">
          <summary>
            <UserRound size={18} />
            <span>
              {accountMode === 'admin' ? 'Admin Account' : accountMode === 'user' ? 'My Account' : 'My Profile'}
            </span>
            <ChevronDown size={17} />
          </summary>
          <div className="profile-dropdown">
            {accountMode === 'admin' ? (
              <>
                <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                  <UserRound size={18} />
                  Admin Dashboard
                </Link>
                <button type="button" onClick={handleLogout}>
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : accountMode === 'user' ? (
              <>
                <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                  <UserRound size={18} />
                  Profile
                </Link>
                <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                  <ReceiptText size={18} />
                  My Orders
                </Link>
                <button type="button" onClick={handleLogout}>
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <UserRound size={18} />
                  Login
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <UserRound size={18} />
                  Register
                </Link>
                <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                  <UserRound size={18} />
                  Admin
                </Link>
              </>
            )}
          </div>
        </details>

        <button
          className="menu-button"
          type="button"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-menu" aria-label="Mobile menu">
          {navItems.map((item) => (
            item === 'Deals' ? (
              <Link
                to={getNavHref(item)}
                key={item}
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </Link>
            ) : (
              <a
                href={getNavHref(item)}
                key={item}
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </a>
            )
          ))}
          {accountMode === 'admin' ? (
            <>
              <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                <UserRound size={18} />
                Admin Dashboard
              </Link>
              <button type="button" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : accountMode === 'user' ? (
            <>
              <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                <UserRound size={18} />
                My Profile
              </Link>
              <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                <ReceiptText size={18} />
                My Orders
              </Link>
              <button type="button" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <UserRound size={18} />
                Login
              </Link>
              <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                <UserRound size={18} />
                Register
              </Link>
              <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                <UserRound size={18} />
                Admin
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
