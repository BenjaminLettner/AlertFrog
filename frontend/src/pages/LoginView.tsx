import { useState } from 'react'

type LoginViewProps = {
  onLogin: (email: string) => void
}

export const LoginView = ({ onLogin }: LoginViewProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Enter both email and password to continue')
      return
    }

    setError('')
    onLogin(email)
    setEmail('')
    setPassword('')
  }

  return (
    <div className="glass-card login-card">
      <div className="brand-mark">
        <span className="logo-dot" />
        <div>
          <p className="eyebrow">AlertFrog SIMS</p>
          <h1>Secure Login</h1>
          <p className="eyebrow muted">Manage incidents with confidence.</p>
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
        <button type="submit" className="frog-button">
          Enter Console
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
