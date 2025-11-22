import { useEffect, useMemo, useState } from 'react'
import logoAsset from '../assets/alertfrog-logo.png'
import type { Session } from '../types/session'
import { useIncidents } from '../hooks/useIncidents'

const baseNavItems = ['Dashboard', 'Incidents']

type IncidentsViewProps = {
  session: Session
  onGoDashboard: () => void
  onOpenSettings: () => void
  onOpenUserManagement: () => void
  onOpenLogs?: () => void
  onSignOut: () => void
  onViewIncident: (incidentId: string) => void
}

type ResponderOption = {
  id: string
  name: string
  role: string
}

type FormState = {
  id?: string
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

export const IncidentsView = ({
  session,
  onGoDashboard,
  onOpenSettings,
  onOpenUserManagement,
  onOpenLogs,
  onSignOut,
  onViewIncident,
}: IncidentsViewProps) => {
  const navItems = useMemo(() => {
    return session.role.toLowerCase() === 'admin'
      ? [...baseNavItems, 'User Management', 'Logs']
      : baseNavItems
  }, [session.role])

  const {
    incidents,
    loading,
    error,
    escalatingId,
    escalateIncident,
    refreshIncidents,
    createIncident,
    updateIncident,
    resolveIncident,
    deleteIncident,
  } = useIncidents(session.token)

  const [assignees, setAssignees] = useState<ResponderOption[]>([
    { id: session.id, name: session.name, role: session.role },
  ])

  const emptyForm: FormState = {
    id: undefined,
    title: '',
    description: '',
    severity: 'Medium',
    status: 'Open',
    cve: '',
    affectedSystem: '',
    assignedUserId: session.id,
  }

  const [form, setForm] = useState<FormState>(emptyForm)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const isAdmin = session.role.toLowerCase() === 'admin'

  useEffect(() => {
    const fetchResponders = async () => {
      if (!isAdmin) {
        return
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/api/users`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })

        if (!response.ok) {
          throw new Error('Unable to load responder list')
        }

        const data = (await response.json()) as { id: string; name: string; role: string }[]
        setAssignees(data.map((user) => ({ id: user.id, name: user.name, role: user.role })))
        if (!form.id) {
          setForm((prev) => ({ ...prev, assignedUserId: data[0]?.id ?? session.id }))
        }
      } catch (err) {
        if (err instanceof Error) {
          setActionError(err.message)
        }
      }
    }

    fetchResponders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, session.token])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setActionError('')
    setSuccess('')
  }

  const resetForm = () => {
    setForm(emptyForm)
    setActionError('')
    setSuccess('')
    setShowCreateForm(false)
  }

  const handleEdit = (incidentId: string) => {
    const incident = incidents.find((item) => item.id === incidentId)
    if (!incident) return
    setForm({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      cve: incident.cve ?? '',
      affectedSystem: incident.affectedSystem ?? '',
      assignedUserId: incident.assignedUserId,
    })
    setShowCreateForm(true)
    setSuccess('Editing existing incident')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setActionError('')
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      cve: form.cve.trim() || null,
      affectedSystem: form.affectedSystem.trim() || null,
      assignedUserId: form.assignedUserId || session.id,
      registrantUserId: session.id,
    }

    try {
      if (!payload.title || !payload.description) {
        throw new Error('Title and description are required')
      }

      if (form.id) {
        await updateIncident(form.id, payload)
        setSuccess('Incident updated')
      } else {
        await createIncident(payload)
        setSuccess('Incident created')
      }
      resetForm()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResolve = async (incidentId: string) => {
    try {
      await resolveIncident(incidentId)
      setSuccess('Incident resolved')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resolve incident')
    }
  }

  const handleDelete = async (incidentId: string) => {
    if (!confirm('Delete this incident?')) return
    try {
      await deleteIncident(incidentId)
      setSuccess('Incident deleted')
      if (form.id === incidentId) {
        resetForm()
      }
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
            <p className="eyebrow">Live response</p>
            <h1>Incident desk</h1>
            <p className="muted">Monitor severity, owners, and escalate with a single click.</p>
          </div>
          <div className="header-actions">
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="ghost" type="button" onClick={refreshIncidents} disabled={loading}>
              Refresh
            </button>
            {!showCreateForm && (
              <button className="frog-button" type="button" onClick={() => setShowCreateForm(true)}>
                Create incident
              </button>
            )}
          </div>
        </header>

        {showCreateForm && (
          <section className="glass-card">
            <h3>{form.id ? 'Edit incident' : 'Create incident'}</h3>
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
              {form.id && (
                <button type="button" className="ghost small" onClick={resetForm} disabled={isSaving}>
                  Cancel edit
                </button>
              )}
              <button className="frog-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : form.id ? 'Update incident' : 'Create incident'}
              </button>
            </div>
          </form>
        </section>
        )}

        <section className="glass-card incidents-card">
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
                    {incident.resolvedAt && (
                      <p className="muted small">Resolved {formatTimestamp(incident.resolvedAt)}</p>
                    )}
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
                    <button className="ghost small" type="button" onClick={() => onViewIncident(incident.id)}>
                      View
                    </button>
                    {incident.canEscalate && (
                      <button
                        className="ghost small"
                        type="button"
                        onClick={() => escalateIncident(incident.id)}
                        disabled={escalatingId === incident.id}
                      >
                        {escalatingId === incident.id ? 'Escalating…' : 'Escalate'}
                      </button>
                    )}
                    {incident.status.toLowerCase() !== 'resolved' && (
                      <button className="ghost small" type="button" onClick={() => handleResolve(incident.id)}>
                        Resolve
                      </button>
                    )}
                    <button className="ghost small" type="button" onClick={() => handleEdit(incident.id)}>
                      Edit
                    </button>
                    {isAdmin && (
                      <button
                        className="ghost small button-danger"
                        type="button"
                        onClick={() => handleDelete(incident.id)}
                      >
                        Delete
                      </button>
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
