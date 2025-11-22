import { useEffect, useState } from 'react'
import './App.css'
import type { Session } from './types/session'
import { LoginView } from './pages/LoginView'
import { DashboardView } from './pages/DashboardView'
import { SettingsView } from './pages/SettingsView'
import { UserManagementView } from './pages/UserManagementView'
import { IncidentsView } from './pages/IncidentsView'
import { IncidentDetailView } from './pages/IncidentDetailView'
import { LogsView } from './pages/LogsView'

const STORAGE_KEY = 'alertfrog_session'

type View = 'dashboard' | 'incidents' | 'incidentDetail' | 'settings' | 'userManagement' | 'logs'

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

  const [view, setView] = useState<View>('dashboard')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

  const handleLogin = (payload: Session) => {
    setSession(payload)
    setView('dashboard')
  }

  const handleSignOut = () => {
    setSession(null)
    setView('dashboard')
  }

  const handleSessionUpdate = (updates: Partial<Session>) => {
    setSession((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  useEffect(() => {
    if (!session) {
      setView('dashboard')
    }
  }, [session])

  return (
    <div className="app-shell">
      {!session ? (
        <LoginView onLogin={handleLogin} />
      ) : view === 'settings' ? (
        <SettingsView
          session={session}
          onBack={() => setView('dashboard')}
          onSessionUpdate={handleSessionUpdate}
          onSignOut={handleSignOut}
          onOpenUserManagement={() => setView('userManagement')}
          onOpenIncidents={() => setView('incidents')}
          onOpenLogs={() => setView('logs')}
        />
      ) : view === 'incidents' ? (
        <IncidentsView
          session={session}
          onGoDashboard={() => setView('dashboard')}
          onOpenSettings={() => setView('settings')}
          onOpenUserManagement={() => setView('userManagement')}
          onOpenLogs={() => setView('logs')}
          onSignOut={handleSignOut}
          onViewIncident={(incidentId) => {
            setSelectedIncidentId(incidentId)
            setView('incidentDetail')
          }}
        />
      ) : view === 'incidentDetail' && selectedIncidentId ? (
        <IncidentDetailView
          session={session}
          incidentId={selectedIncidentId}
          onGoDashboard={() => setView('dashboard')}
          onGoBackToIncidents={() => setView('incidents')}
          onOpenSettings={() => setView('settings')}
          onOpenUserManagement={() => setView('userManagement')}
          onOpenLogs={() => setView('logs')}
          onSignOut={handleSignOut}
        />
      ) : view === 'userManagement' ? (
        <UserManagementView
          session={session}
          onBack={() => setView('dashboard')}
          onOpenIncidents={() => setView('incidents')}
          onOpenLogs={() => setView('logs')}
          onSignOut={handleSignOut}
        />
      ) : view === 'logs' ? (
        <LogsView
          session={session}
          onGoDashboard={() => setView('dashboard')}
          onOpenSettings={() => setView('settings')}
          onOpenUserManagement={() => setView('userManagement')}
          onOpenIncidents={() => setView('incidents')}
          onSignOut={handleSignOut}
        />
      ) : (
        <DashboardView
          session={session}
          onSignOut={handleSignOut}
          onOpenSettings={() => setView('settings')}
          onOpenUserManagement={() => setView('userManagement')}
          onOpenIncidents={() => setView('incidents')}
          onOpenLogs={() => setView('logs')}
        />
      )}
    </div>
  )
}

export default App
