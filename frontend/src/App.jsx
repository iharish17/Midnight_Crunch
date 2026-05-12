import { Route, Routes, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import DealsPage from './pages/DealsPage'
import LandingPage from './pages/LandingPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    setIsLoggedIn(!!token)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="loading-spinner-overlay">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (

    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/profile" /> : <AuthPage mode="login" onAuthSuccess={() => setIsLoggedIn(true)} />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/profile" /> : <AuthPage mode="register" onAuthSuccess={() => setIsLoggedIn(true)} />}
        />
        <Route path="/profile" element={isLoggedIn ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
