import { useEffect, useMemo, useState } from 'react'
import type { Session } from '../types/session'
import logoAsset from '../assets/alertfrog-logo.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const baseNavItems = ['Dashboard', 'Incidents']

type FormState = {
  name: string
  email: string
  currentPassword: string
  newPassword: string
}

type ProfilePayload = {
  id: string
  name: string
  email: string
  role: string
}

type SettingsViewProps = {
  session: Session
  onBack: () => void
  onSessionUpdate: (updates: Partial<Session>) => void
  onSignOut: () => void
  onOpenUserManagement: () => void
  onOpenIncidents: () => void
}
export const SettingsView = ({
  session,
  onBack,
  onSessionUpdate,
  onSignOut,
  onOpenUserManagement,
  onOpenIncidents,
}: SettingsViewProps) => {
  const navItems = session.role.toLowerCase() === 'admin' ? [...baseNavItems, 'User Management'] : baseNavItems
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [form, setForm] = useState<FormState>({
    name: session.name,
    email: session.email,
    currentPassword: '',
    newPassword: '',
  })
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let isMounted = true
    const fetchProfile = async () => {
      setIsFetching(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        if (!response.ok) {
          throw new Error('Unable to load profile details')
        }
        const data = (await response.json()) as ProfilePayload
        if (!isMounted) return
        setProfile(data)
        setForm((prev) => ({ ...prev, name: data.name, email: data.email }))
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Unexpected error while loading profile')
        }
      } finally {
        if (isMounted) {
          setIsFetching(false)
        }
      }
    }

    fetchProfile()
    return () => {
      isMounted = false
    }
  }, [session.token])

  const hasChanges = useMemo(() => {
    if (!profile) return false
    return (
      profile.name !== form.name ||
      profile.email !== form.email ||
      Boolean(form.newPassword)
    )
  }, [form, profile])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return

    const payload: Record<string, string> = {}

    if (form.name.trim() && form.name.trim() !== profile.name) {
      payload.name = form.name.trim()
    }

    if (form.email.trim() && form.email.trim() !== profile.email) {
      payload.email = form.email.trim().toLowerCase()
    }

    if (form.newPassword.trim()) {
      if (!form.currentPassword.trim()) {
        setError('Enter your current password to set a new one.')
        return
      }
      payload.currentPassword = form.currentPassword
      payload.newPassword = form.newPassword
    }

    if (Object.keys(payload).length === 0) {
      setSuccess('No changes to save.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to update profile')
      }

      const updated = (await response.json()) as ProfilePayload
      setProfile(updated)
      setForm({ name: updated.name, email: updated.email, currentPassword: '', newPassword: '' })
      setSuccess('Profile updated successfully')
      onSessionUpdate({ name: updated.name, email: updated.email })
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unexpected error while updating profile')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="settings-layout">
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
                className={item === 'Dashboard' ? '' : item === 'Incidents' ? '' : ''}
                onClick={
                  item === 'Dashboard'
                    ? onBack
                    : item === 'User Management'
                      ? onOpenUserManagement
                      : item === 'Incidents'
                        ? onOpenIncidents
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

      <main className="main-panel settings-panel glass-card">
        <header className="page-header">
          <div>
            <p className="eyebrow">Account</p>
            <h1>User settings</h1>
          </div>
          <div className="header-actions">
            <button className="ghost" type="button" onClick={onBack}>
              Back to dashboard
            </button>
          </div>
        </header>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="input-label">
            Display name
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isFetching || isSaving}
            />
          </label>

          <label className="input-label">
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={isFetching || isSaving}
            />
          </label>

          <div className="grid two-cols">
            <label className="input-label">
              Current password
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => handleChange('currentPassword', e.target.value)}
                placeholder="••••••••"
                disabled={isFetching || isSaving}
              />
            </label>

            <label className="input-label">
              New password
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                placeholder="••••••••"
                disabled={isFetching || isSaving}
              />
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          <div className="settings-actions">
            <button type="submit" className="frog-button" disabled={isSaving || isFetching || !hasChanges}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
