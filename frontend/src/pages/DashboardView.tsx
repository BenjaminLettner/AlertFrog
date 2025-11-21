import { useMemo } from 'react'
import type { Session } from '../types/session'
import { useIncidents } from '../hooks/useIncidents'
import logoAsset from '../assets/alertfrog-logo.png'

type DashboardViewProps = {
  session: Session
  onSignOut: () => void
  onOpenSettings: () => void
  onOpenUserManagement: () => void
  onOpenIncidents: () => void
  onOpenLogs?: () => void
}

const baseNavItems = ['Dashboard', 'Incidents']

export const DashboardView = ({
  session,
  onSignOut,
  onOpenSettings,
  onOpenUserManagement,
  onOpenIncidents,
  onOpenLogs,
}: DashboardViewProps) => {
  const { incidents, loading, error, escalatingId, escalateIncident } = useIncidents(session.token)

  const navItems = useMemo(() => {
    return session.role.toLowerCase() === 'admin'
      ? [...baseNavItems, 'User Management', 'Logs']
      : baseNavItems
  }, [session.role])

  const stats = useMemo(() => {
    if (loading) {
      return [
        { title: 'Active incidents', value: '—' },
        { title: 'Resolved today', value: '—' },
      ]
    }

    const activeCount = incidents.filter((incident) => incident.status.toLowerCase() !== 'resolved').length
    const resolvedToday = incidents.filter((incident) => {
      if (incident.status.toLowerCase() !== 'resolved') return false
      const created = new Date(incident.createdAt)
      const now = new Date()
      return (
        created.getUTCFullYear() === now.getUTCFullYear() &&
        created.getUTCMonth() === now.getUTCMonth() &&
        created.getUTCDate() === now.getUTCDate()
      )
    }).length

    return [
      { title: 'Active incidents', value: String(activeCount) },
      { title: 'Resolved today', value: String(resolvedToday) },
    ]
  }, [incidents, loading])

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    })

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-card">
        <div className="sidebar-brand">
          <img src={logoAsset} alt="AlertFrog" className="logo-img" width={60} height={60} />
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
                className={item === 'Dashboard' ? 'active' : ''}
                onClick=
                  {item === 'User Management'
                    ? onOpenUserManagement
                    : item === 'Incidents'
                      ? onOpenIncidents
                      : item === 'Logs'
                        ? onOpenLogs
                        : undefined}
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
            <p className="eyebrow">Dashboard</p>
            <h1>Overview of your security infrastructure</h1>
          </div>
        </header>

        <section className="stats-row">
          {stats.map((stat) => (
            <article key={stat.title} className="glass-card stat-tile">
              <p className="eyebrow">{stat.title}</p>
              <h3>{stat.value}</h3>
            </article>
          ))}
        </section>

        <section className="glass-card incidents-card">
          <div className="incidents-card__head">
            <div>
              <h4>Incidents</h4>
              <p className="muted">Track responders, systems, and escalation paths.</p>
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
          </div>
          {loading ? (
            <p className="muted">Loading incidents…</p>
          ) : incidents.length === 0 ? (
            <p className="muted">No incidents are currently open.</p>
          ) : (
            <div className="table incidents-table">
              <div className="table-row head">
                <span>Title</span>
                <span>Severity</span>
                <span>Status</span>
                <span>CVE</span>
                <span>Affected system</span>
                <span>Assigned</span>
                <span>Registrant</span>
                <span>Timestamp</span>
                <span></span>
              </div>
              {incidents.map((incident) => (
                <div key={incident.id} className="table-row">
                  <span>
                    <strong>{incident.title}</strong>
                    <p className="muted description-text">{incident.description}</p>
                  </span>
                  <span>
                    <span className={`severity ${incident.severity.toLowerCase()}`}>
                      {incident.severity}
                    </span>
                  </span>
                  <span>
                    <span className={`status-chip status-${incident.status.toLowerCase()}`}>
                      {incident.status}
                    </span>
                  </span>
                  <span>{incident.cve ?? '—'}</span>
                  <span>{incident.affectedSystem ?? '—'}</span>
                  <span>
                    <span className="assigned-name">{incident.assignedUserName}</span>
                    <span className="assigned-role">{incident.assignedUserRole}</span>
                  </span>
                  <span>
                    <span className="assigned-name">{incident.registrantName}</span>
                    <span className="assigned-role muted">Registrant</span>
                  </span>
                  <span>{formatTimestamp(incident.createdAt)}</span>
                  <span className="table-actions">
                    {incident.canEscalate ? (
                      <button
                        className="ghost small"
                        type="button"
                        onClick={() => escalateIncident(incident.id)}
                        disabled={escalatingId === incident.id}
                      >
                        {escalatingId === incident.id ? 'Escalating…' : 'Escalate'}
                      </button>
                    ) : (
                      <span className="muted">Max level</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
