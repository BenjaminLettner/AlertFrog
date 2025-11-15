import { useEffect, useState } from 'react'
import './App.css'
import type { Session } from './types/session'
import { LoginView } from './pages/LoginView'
import { DashboardView } from './pages/DashboardView'

const STORAGE_KEY = 'alertfrog_session'

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  })

  useEffect(() => {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [session])

  const handleLogin = (payload: Session) => {
    setSession(payload)
  }

  const handleSignOut = () => {
    setSession(null)
  }

  return (
    <div className="app-shell">
      {!session ? (
        <LoginView onLogin={handleLogin} />
      ) : (
        <DashboardView session={session} onSignOut={handleSignOut} />
      )}
    </div>
  )
}

export default App
