import { useState } from 'react'
import { ArrowLeft, Building2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { userRegister, userLogin, sendUserRegisterOtp, verifyUserRegisterOtp } from '../api'
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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleEmailChange(value) {
    handleChange('email', value)
    setOtpCode('')
    setOtpSent(false)
    setOtpVerified(false)
  }

  async function handleSendOtp() {
    if (!form.email.trim()) {
      showError('Please enter your email first')
      return
    }

    setOtpSending(true)
    try {
      await sendUserRegisterOtp(form.email)
      setOtpSent(true)
      setOtpVerified(false)
      showSuccess('OTP sent to your email')
    } catch (error) {
      showError(error.message || 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  async function handleVerifyOtp() {
    if (!form.email.trim()) {
      showError('Please enter your email first')
      return
    }

    if (!otpCode.trim()) {
      showError('Please enter the OTP')
      return
    }

    setOtpVerifying(true)
    try {
      await verifyUserRegisterOtp(form.email, otpCode)
      setOtpVerified(true)
      showSuccess('Email verified successfully')
    } catch (error) {
      setOtpVerified(false)
      showError(error.message || 'OTP verification failed')
    } finally {
      setOtpVerifying(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (isRegister && registerStep === 1) {
      if (!otpVerified) {
        showError('Please verify your email with OTP before continuing')
        return
      }
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
                  onChange={(e) => handleEmailChange(e.target.value)}
                required
              />
            </span>
          </label>
          )}

          {isRegister && registerStep === 1 && (
            <div className="otp-panel">
              <div className="otp-actions-row">
                <button
                  className="auth-submit otp-action-btn"
                  type="button"
                  disabled={otpSending || otpVerifying}
                  onClick={handleSendOtp}
                >
                  {otpSending ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
                <span className={`otp-status ${otpVerified ? 'verified' : ''}`}>
                  {otpVerified ? 'Email verified' : otpSent ? 'OTP sent' : 'OTP not sent'}
                </span>
              </div>

              {otpSent && !otpVerified && (
                <div className="otp-actions-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button
                    className="auth-submit otp-action-btn"
                    type="button"
                    disabled={otpVerifying || otpSending}
                    onClick={handleVerifyOtp}
                  >
                    {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}
            </div>
          )}

          {isRegister && registerStep === 1 && (
            <label>
              Hostel and room
              <span>
                <Building2 size={19} />
                <input
                  type="text"
                  placeholder="Enter hostel block and room number"
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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
