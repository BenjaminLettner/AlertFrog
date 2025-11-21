import { useEffect, useMemo, useState } from 'react'
import logoAsset from '../assets/alertfrog-logo.png'
import type { Session } from '../types/session'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const baseNavItems = ['Dashboard', 'Incidents']

type LogsViewProps = {
  session: Session
  onGoDashboard: () => void
  onOpenSettings: () => void
  onOpenUserManagement: () => void
  onOpenIncidents: () => void
  onSignOut: () => void
}

type AuditLogEntry = {
  id: string
  timestamp: string
  action: string
  actorEmail: string
  actorRole: string
  targetEntity?: string
  details?: string
}

export const LogsView = ({
  session,
  onGoDashboard,
  onOpenSettings,
  onOpenUserManagement,
  onOpenIncidents,
  onSignOut,
}: LogsViewProps) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const navItems = useMemo(() => {
    return session.role.toLowerCase() === 'admin'
      ? [...baseNavItems, 'User Management', 'Logs']
      : baseNavItems
  }, [session.role])

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/logs?count=100&skip=0`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load logs')
        }

        const data = (await response.json()) as AuditLogEntry[]
        setLogs(data)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Unexpected error while loading logs')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [session.token])

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-card">
        <div className="sidebar-brand">
          <img src={logoAsset} alt="AlertFrog" className="logo-img" width={40} height={40} />
          <div>
            <p className="eyebrow">SIMS</p>
            <strong>AlertFrog</strong>
          </div>
        </div>
        <nav>
          <ul>
            {navItems.map((item) => (
              <li
                key={item}
                className={item === 'Logs' ? 'active' : ''}
                onClick={
                  item === 'Dashboard'
                    ? onGoDashboard
                    : item === 'Incidents'
                      ? onOpenIncidents
                      : item === 'User Management'
                        ? onOpenUserManagement
                        : undefined
                }
              >
                {item}
              </li>
            ))}
          </ul>
        </nav>
        <button className="sidebar-user" onClick={onOpenSettings}>
          <p className="sidebar-user__email">{session.email}</p>
          <p className="sidebar-user__role">{session.role}</p>
        </button>
        <button className="ghost sidebar-signout" onClick={onSignOut}>
          Sign out
        </button>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Audit Logs</h1>
          </div>
          <div className="header-actions">
            <button className="ghost" type="button" onClick={onGoDashboard}>
              Back to dashboard
            </button>
          </div>
        </header>

        <section className="glass-card incidents-card">
          <div className="incidents-card__head">
            <div>
              <h4>System Activity</h4>
              <p className="muted">Track all user actions, logins, and incident changes.</p>
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
          </div>
          {loading ? (
            <p className="muted">Loading logs…</p>
          ) : logs.length === 0 ? (
            <p className="muted">No logs available.</p>
          ) : (
            <div className="table logs-table">
              <div className="table-row head">
                <span>Timestamp</span>
                <span>Action</span>
                <span>Actor</span>
                <span>Role</span>
                <span>Target</span>
                <span>Details</span>
              </div>
              {logs.map((log) => (
                <div key={log.id} className="table-row">
                  <span>{formatTimestamp(log.timestamp)}</span>
                  <span>
                    <span className="log-action">{log.action}</span>
                  </span>
                  <span>{log.actorEmail}</span>
                  <span>
                    <span className="assigned-role">{log.actorRole}</span>
                  </span>
                  <span>{log.targetEntity ?? '—'}</span>
                  <span className="muted">{log.details ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
