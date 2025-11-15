import { useState } from 'react'
import './App.css'
import type { Session } from './types/session'
import { LoginView } from './pages/LoginView'
import { DashboardView } from './pages/DashboardView'

const placeholderUser: Session = {
  name: 'Alex Carter',
  email: 'alex@alertfrog.io',
}

function App() {
  const [session, setSession] = useState<Session | null>(null)

  const handleLogin = (email: string) => {
    setSession({ ...placeholderUser, email })
  }

  const handleSignOut = () => setSession(null)

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
