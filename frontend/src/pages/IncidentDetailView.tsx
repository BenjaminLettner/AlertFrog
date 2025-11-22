import { useEffect, useMemo, useState } from 'react'
import logoAsset from '../assets/alertfrog-logo.png'
import type { Session } from '../types/session'
import type { Incident } from '../types/incident'
import type { UpdateIncidentPayload } from '../hooks/useIncidents'

const baseNavItems = ['Dashboard', 'Incidents']

type IncidentDetailViewProps = {
  session: Session
  incidentId: string
  onGoDashboard: () => void
  onGoBackToIncidents: () => void
  onOpenSettings: () => void
  onOpenUserManagement: () => void
  onOpenLogs?: () => void
  onSignOut: () => void
}

type ResponderOption = {
  id: string
  name: string
  role: string
}

type FormState = {
  title: string
  description: string
  severity: string
  status: string
  cve: string
  affectedSystem: string
  assignedUserId: string
}

const severityOptions = ['Low', 'Medium', 'High', 'Critical']
const statusOptions = ['Open', 'Investigating', 'Resolved']

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const IncidentDetailView = ({
  session,
  incidentId,
  onGoDashboard,
  onGoBackToIncidents,
  onOpenSettings,
  onOpenUserManagement,
  onOpenLogs,
  onSignOut,
}: IncidentDetailViewProps) => {
  const navItems = useMemo(() => {
    return session.role.toLowerCase() === 'admin'
      ? [...baseNavItems, 'User Management', 'Logs']
      : baseNavItems
  }, [session.role])

  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignees, setAssignees] = useState<ResponderOption[]>([
    { id: session.id, name: session.name, role: session.role },
  ])
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    severity: 'Medium',
    status: 'Open',
    cve: '',
    affectedSystem: '',
    assignedUserId: session.id,
  })
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [escalating, setEscalating] = useState(false)

  const isAdmin = session.role.toLowerCase() === 'admin'

  useEffect(() => {
    const fetchIncident = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })

        if (!response.ok) {
          throw new Error('Failed to load incident')
        }

        const data = (await response.json()) as Incident
        setIncident(data)
        setForm({
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status,
          cve: data.cve ?? '',
          affectedSystem: data.affectedSystem ?? '',
          assignedUserId: data.assignedUserId,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    }

    fetchIncident()
  }, [incidentId, session.token])

  useEffect(() => {
    const fetchResponders = async () => {
      if (!isAdmin) {
        return
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })

        if (!response.ok) {
          throw new Error('Unable to load responder list')
        }

        const data = (await response.json()) as { id: string; name: string; role: string }[]
        setAssignees(data.map((user) => ({ id: user.id, name: user.name, role: user.role })))
      } catch (err) {
        if (err instanceof Error) {
          setActionError(err.message)
        }
      }
    }

    fetchResponders()
  }, [isAdmin, session.token])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setActionError('')
    setSuccess('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setActionError('')
    setSuccess('')

    const payload: UpdateIncidentPayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      cve: form.cve.trim() || null,
      affectedSystem: form.affectedSystem.trim() || null,
      assignedUserId: form.assignedUserId || session.id,
    }

    try {
      if (!payload.title || !payload.description) {
        throw new Error('Title and description are required')
      }

      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to update incident')
      }

      const updated = (await response.json()) as Incident
      setIncident(updated)
      setSuccess('Incident updated successfully')
      setIsEditing(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEscalate = async () => {
    setEscalating(true)
    setActionError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/escalate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message ?? 'Unable to escalate incident')
      }

      const updated = (await response.json()) as Incident
      setIncident(updated)
      setSuccess('Incident escalated successfully')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unexpected error while escalating incident')
    } finally {
      setEscalating(false)
    }
  }

  const handleResolve = async () => {
    setActionError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to resolve incident')
      }

      const resolved = (await response.json()) as Incident
      setIncident(resolved)
      setSuccess('Incident resolved')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resolve incident')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this incident? This action cannot be undone.')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to delete incident')
      }

      onGoBackToIncidents()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete incident')
    }
  }

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="management-layout">
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
                className={item === 'Incidents' ? 'active' : ''}
                onClick={
                  item === 'Dashboard'
                    ? onGoDashboard
                    : item === 'Incidents'
                      ? onGoBackToIncidents
                      : item === 'User Management'
                        ? onOpenUserManagement
                        : item === 'Logs'
                          ? onOpenLogs
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

      <main className="management-panel glass-card">
        <header className="page-header">
          <div>
            <button className="ghost small" type="button" onClick={onGoBackToIncidents}>
              ← Back to incidents
            </button>
            <h1>Incident details</h1>
            <p className="muted">View and manage incident information.</p>
          </div>
          <div className="header-actions">
            {error && <p className="error-text" role="alert">{error}</p>}
          </div>
        </header>

        {loading ? (
          <p className="muted">Loading incident…</p>
        ) : !incident ? (
          <p className="error-text">Incident not found</p>
        ) : (
          <>
            {!isEditing ? (
              <section className="glass-card">
                <div className="incident-detail-header">
                  <div>
                    <h2>{incident.title}</h2>
                    <div className="incident-detail-meta">
                      <span className={`severity ${incident.severity.toLowerCase()}`}>
                        {incident.severity}
                      </span>
                      <span className={`status-chip status-${incident.status.toLowerCase()}`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>
                  <div className="incident-detail-actions">
                    {incident.canEscalate && (
                      <button
                        className="ghost"
                        type="button"
                        onClick={handleEscalate}
                        disabled={escalating}
                      >
                        {escalating ? 'Escalating…' : 'Escalate'}
                      </button>
                    )}
                    {incident.status.toLowerCase() !== 'resolved' && (
                      <button className="ghost" type="button" onClick={handleResolve}>
                        Resolve
                      </button>
                    )}
                    <button className="frog-button" type="button" onClick={() => setIsEditing(true)}>
                      Edit incident
                    </button>
                    {isAdmin && (
                      <button
                        className="ghost button-danger"
                        type="button"
                        onClick={handleDelete}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {(actionError || success) && (
                  <div style={{ marginTop: '1rem' }}>
                    {actionError && <p className="error-text">{actionError}</p>}
                    {success && <p className="success-text">{success}</p>}
                  </div>
                )}

                <div className="incident-detail-content">
                  <div className="detail-section">
                    <h3>Description</h3>
                    <p>{incident.description}</p>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-section">
                      <h4>CVE</h4>
                      <p>{incident.cve ?? '—'}</p>
                    </div>
                    <div className="detail-section">
                      <h4>Affected system</h4>
                      <p>{incident.affectedSystem ?? '—'}</p>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-section">
                      <h4>Assigned responder</h4>
                      <p>
                        <strong>{incident.assignedUserName}</strong>
                        <br />
                        <span className="muted">{incident.assignedUserRole}</span>
                      </p>
                    </div>
                    <div className="detail-section">
                      <h4>Registrant</h4>
                      <p>
                        <strong>{incident.registrantName}</strong>
                        <br />
                        <span className="muted">Registrant</span>
                      </p>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-section">
                      <h4>Created</h4>
                      <p>{formatTimestamp(incident.createdAt)}</p>
                    </div>
                    <div className="detail-section">
                      <h4>Last updated</h4>
                      <p>{formatTimestamp(incident.updatedAt)}</p>
                    </div>
                    {incident.resolvedAt && (
                      <div className="detail-section">
                        <h4>Resolved</h4>
                        <p>{formatTimestamp(incident.resolvedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : (
              <section className="glass-card">
                <h3>Edit incident</h3>
                <form className="incidents-form" onSubmit={handleSubmit}>
                  <div className="grid two-cols">
                    <label className="input-label">
                      Title
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        disabled={isSaving}
                      />
                    </label>
                    <label className="input-label">
                      Severity
                      <select value={form.severity} onChange={(e) => handleChange('severity', e.target.value)} disabled={isSaving}>
                        {severityOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="input-label">
                    Description
                    <textarea
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      disabled={isSaving}
                      rows={3}
                    />
                  </label>
                  <div className="grid two-cols">
                    <label className="input-label">
                      Status
                      <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} disabled={isSaving}>
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="input-label">
                      CVE
                      <input
                        type="text"
                        value={form.cve}
                        onChange={(e) => handleChange('cve', e.target.value)}
                        placeholder="CVE-2025-1234"
                        disabled={isSaving}
                      />
                    </label>
                  </div>
                  <div className="grid two-cols">
                    <label className="input-label">
                      Affected system
                      <input
                        type="text"
                        value={form.affectedSystem}
                        onChange={(e) => handleChange('affectedSystem', e.target.value)}
                        placeholder="host-name"
                        disabled={isSaving}
                      />
                    </label>
                    <label className="input-label">
                      Assigned responder
                      {assignees.length > 1 ? (
                        <select
                          value={form.assignedUserId}
                          onChange={(e) => handleChange('assignedUserId', e.target.value)}
                          disabled={isSaving}
                        >
                          {assignees.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="muted small">Assigned to {session.name}</p>
                      )}
                    </label>
                  </div>

                  {(actionError || success) && (
                    <div>
                      {actionError && <p className="error-text">{actionError}</p>}
                      {success && <p className="success-text">{success}</p>}
                    </div>
                  )}

                  <div className="management-actions">
                    <button type="button" className="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      Cancel
                    </button>
                    <button className="frog-button" type="submit" disabled={isSaving}>
                      {isSaving ? 'Saving…' : 'Update incident'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
