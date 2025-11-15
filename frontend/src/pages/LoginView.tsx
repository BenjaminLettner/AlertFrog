import { useState } from 'react'
import type { Session } from '../types/session'
import logoAsset from '../assets/alertfrog-logo.png'

type LoginViewProps = {
  onLogin: (session: Session) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const LoginView = ({ onLogin }: LoginViewProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Enter both email and password to continue')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message ?? 'Login failed')
      }

      const payload = (await response.json()) as Session
      onLogin(payload)
      setEmail('')
      setPassword('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unexpected error during login')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-card login-card">
      <div className="brand-mark">
        <img src={logoAsset} alt="AlertFrog" className="logo-img hero" width={72} height={72} />
        <div>
          <p className="eyebrow">AlertFrog SIMS</p>
          <p className="muted">Authenticate to access your security console.</p>
        </div>
      </div>

      <form className="stack gap" onSubmit={handleSubmit}>
        <label className="input-label">
          Email
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="input-label">
          Password
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="frog-button" disabled={isSubmitting}>
          {isSubmitting ? 'Entering...' : 'Enter Console'}
        </button>
      </form>

      <ul className="login-highlights">
        <li>Real-time incident feed</li>
        <li>Role-based user controls</li>
        <li>Audit-ready activity logs</li>
      </ul>
    </div>
  )
}
