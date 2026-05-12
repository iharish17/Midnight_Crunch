import { useState } from 'react'
import { ArrowLeft, Building2, Eye, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { userRegister, userLogin } from '../api'
import Navbar from '../components/Navbar'
import { showSuccess, showError } from '../utils/toast'
import '../App.css'

function AuthPage({ mode, onAuthSuccess }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const [registerStep, setRegisterStep] = useState(1)

  const [form, setForm] = useState({
    name: '',
    email: '',
    hostelAndRoom: '',
    mobileNumber: '',
    year: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (isRegister && registerStep === 1) {
      setRegisterStep(2)
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        const response = await userRegister({
          name: form.name,
          email: form.email,
          hostelAndRoom: form.hostelAndRoom,
          mobileNumber: form.mobileNumber,
          year: form.year,
          password: form.password,
        })
        localStorage.setItem('userToken', response.token)
        if (onAuthSuccess) onAuthSuccess()
        showSuccess('Registration successful! Redirecting...')
        navigate('/profile')
      } else {
        const response = await userLogin({
          email: form.email,
          password: form.password,
        })
        localStorage.setItem('userToken', response.token)
        if (onAuthSuccess) onAuthSuccess()
        showSuccess('Login successful! Redirecting...')
        navigate('/profile')
      }
    } catch (error) {
      showError(error.message || (isRegister ? 'Registration failed' : 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page simple-auth">
      <Navbar />
      <section className="auth-card" aria-label={isRegister ? 'Hosteller registration' : 'Hosteller login'}>
        <Link className="back-link dark" to="/">
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">Hosteller account</p>
          <h1>{isRegister ? 'Register' : 'Login'}</h1>
          {isRegister && <p>Step {registerStep} of 2</p>}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && registerStep === 1 && (
            <label>
              Full name
              <span>
                <UserRound size={19} />
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </span>
            </label>
          )}

          {(!isRegister || registerStep === 1) && (
          <label>
            Email
            <span>
              <Mail size={19} />
              <input
                type="email"
                placeholder="Enter email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </span>
          </label>
          )}

          {isRegister && registerStep === 1 && (
            <label>
              Hostel and room
              <span>
                <Building2 size={19} />
                <input
                  type="text"
                  placeholder="Enter hostel and room number"
                  value={form.hostelAndRoom}
                  onChange={(e) => handleChange('hostelAndRoom', e.target.value)}
                  required
                />
              </span>
            </label>
          )}

          {(!isRegister || registerStep === 1) && (
          <label>
            Password
            <span>
              <LockKeyhole size={19} />
              <input
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
              <Eye size={18} />
            </span>
          </label>
          )}

          {isRegister && registerStep === 2 && (
            <>
              <label>
                Mobile number
                <span>
                  <Mail size={19} />
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={form.mobileNumber}
                    onChange={(e) => handleChange('mobileNumber', e.target.value)}
                    required
                  />
                </span>
              </label>

              <label>
                Year
                <span>
                  <Building2 size={19} />
                  <input
                    type="text"
                    placeholder="Enter year (e.g. 2nd Year)"
                    value={form.year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    required
                  />
                </span>
              </label>

              <button
                className="auth-submit"
                type="button"
                disabled={loading}
                onClick={() => setRegisterStep(1)}
              >
                Back
              </button>
            </>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Processing...' : isRegister ? (registerStep === 1 ? 'Next' : 'Complete Registration') : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New hosteller?'}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Login' : 'Register'}
          </Link>
        </p>
      </section>
    </main>
  )
}

export default AuthPage
