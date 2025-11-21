import { useEffect, useMemo, useState } from 'react'
import logoAsset from '../assets/alertfrog-logo.png'
import type { Session } from '../types/session'
import type { UserSummary } from '../types/user'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const baseNavItems = ['Dashboard', 'Incidents']

type UserManagementViewProps = {
  session: Session
  onBack: () => void
  onOpenIncidents: () => void
  onOpenLogs?: () => void
  onSignOut: () => void
}

type FormState = {
  id?: string
  name: string
  email: string
  role: string
  password: string
}

const emptyForm: FormState = {
  id: undefined,
  name: '',
  email: '',
  role: 'User',
  password: '',
}

export const UserManagementView = ({ session, onBack, onOpenIncidents, onOpenLogs, onSignOut }: UserManagementViewProps) => {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  const navItems = useMemo(() => {
    return session.role.toLowerCase() === 'admin'
      ? [...baseNavItems, 'User Management', 'Logs']
      : baseNavItems
  }, [session.role])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load users')
        }

        const data = (await response.json()) as UserSummary[]
        setUsers(data)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Unexpected error while loading users')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [session.token])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleEdit = (user: UserSummary) => {
    setForm({ id: user.id, name: user.name, email: user.email, role: user.role, password: '' })
    setError('')
    setSuccess('')
  }

  const resetForm = () => {
    setForm(emptyForm)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this user?')) return
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message ?? 'Failed to delete user')
      }

      setUsers((prev) => prev.filter((user) => user.id !== id))
      if (form.id === id) {
        resetForm()
      }
      setSuccess('User removed')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unexpected error while deleting')
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    const payload: Record<string, string> = {
      name: form.name,
      email: form.email,
      role: form.role,
    }

    if (!form.id || form.password) {
      payload.password = form.password
    }

    if (form.id && !form.password) {
      delete payload.password
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users${form.id ? `/${form.id}` : ''}`, {
        method: form.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to save user')
      }

      const saved = (await response.json()) as UserSummary
      setUsers((prev) => {
        const others = prev.filter((u) => u.id !== saved.id)
        return [...others, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      setSuccess(form.id ? 'User updated' : 'User created')
      resetForm()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unexpected error while saving user')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const canSubmit = form.name.trim() && form.email.trim() && (form.id ? true : form.password.trim())

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
                className={item === 'User Management' ? 'active' : ''}
                onClick={
                  item === 'Dashboard'
                    ? onBack
                    : item === 'Incidents'
                      ? onOpenIncidents
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
        <div className="sidebar-user static">
          <p className="sidebar-user__email">{session.email}</p>
          <p className="sidebar-user__role">{session.role}</p>
        </div>
        <button className="ghost sidebar-signout" onClick={onSignOut}>
          Sign out
        </button>
      </aside>

      <main className="management-panel glass-card">
        <header className="page-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>User management</h1>
          </div>
          <div className="header-actions">
            <button className="ghost" type="button" onClick={onBack}>
              Back to dashboard
            </button>
          </div>
        </header>

        <section className="glass-card">
          <h3>{form.id ? 'Edit user' : 'Add user'}</h3>
          <form className="management-form" onSubmit={handleSubmit}>
            <label className="input-label">
              Full name
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isSaving}
              />
            </label>
            <label className="input-label">
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isSaving}
              />
            </label>
            <label className="input-label">
              Role
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} disabled={isSaving}>
                <option value="Admin">Admin</option>
                <option value="1st Level">1st Level</option>
                <option value="2nd Level">2nd Level</option>
                <option value="User">User</option>
              </select>
            </label>
            <label className="input-label">
              {form.id ? 'New password (optional)' : 'Temporary password'}
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                disabled={isSaving}
              />
            </label>

            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}

            <div className="management-actions">
              {form.id && (
                <button type="button" className="ghost small" onClick={resetForm} disabled={isSaving}>
                  Cancel editing
                </button>
              )}
              <button type="submit" className="frog-button" disabled={isSaving || !canSubmit}>
                {isSaving ? 'Saving...' : form.id ? 'Save changes' : 'Add user'}
              </button>
            </div>
          </form>
        </section>

        <section className="glass-card">
          <div className="incidents-card__head">
            <div>
              <h4>Existing users</h4>
              <p className="muted">Manage access across your SOC.</p>
            </div>
          </div>
          {loading ? (
            <p className="muted">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="muted">No users yet.</p>
          ) : (
            <div className="table users-table">
              <div className="table-row head">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Created</span>
                <span></span>
              </div>
              {users.map((user) => (
                <div key={user.id} className="table-row">
                  <span>{user.name}</span>
                  <span>{user.email}</span>
                  <span>{user.role}</span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  <span className="table-actions">
                    <button className="ghost small" type="button" onClick={() => handleEdit(user)}>
                      Edit
                    </button>
                    <button
                      className="ghost small button-danger"
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      disabled={user.email === session.email}
                    >
                      Remove
                    </button>
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
