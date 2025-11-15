import { useCallback, useEffect, useState } from 'react'
import type { Incident } from '../types/incident'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type CreateIncidentPayload = {
  title: string
  description: string
  severity: string
  status: string
  cve?: string | null
  affectedSystem?: string | null
  assignedUserId: string
  registrantUserId?: string
}

export type UpdateIncidentPayload = Partial<
  Omit<CreateIncidentPayload, 'registrantUserId'> & {
    registrantUserId?: string
  }
>

export const useIncidents = (token: string) => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [escalatingId, setEscalatingId] = useState<string | null>(null)

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load incidents')
      }

      const payload = (await response.json()) as Incident[]
      setIncidents(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while loading incidents')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  const escalateIncident = useCallback(
    async (incidentId: string) => {
      setEscalatingId(incidentId)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/escalate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.message ?? 'Unable to escalate incident')
        }

        const updated = (await response.json()) as Incident
        setIncidents((prev) => prev.map((item) => (item.id === incidentId ? updated : item)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error while escalating incident')
      } finally {
        setEscalatingId(null)
      }
    },
    [token]
  )

  const createIncident = useCallback(
    async (payload: CreateIncidentPayload) => {
      setError('')
      const response = await fetch(`${API_BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to create incident')
      }

      const created = (await response.json()) as Incident
      setIncidents((prev) => [created, ...prev])
      return created
    },
    [token]
  )

  const updateIncident = useCallback(
    async (incidentId: string, payload: UpdateIncidentPayload) => {
      setError('')
      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to update incident')
      }

      const updated = (await response.json()) as Incident
      setIncidents((prev) => prev.map((item) => (item.id === incidentId ? updated : item)))
      return updated
    },
    [token]
  )

  const resolveIncident = useCallback(
    async (incidentId: string) => {
      setError('')
      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to resolve incident')
      }

      const resolved = (await response.json()) as Incident
      setIncidents((prev) => prev.map((item) => (item.id === incidentId ? resolved : item)))
      return resolved
    },
    [token]
  )

  const deleteIncident = useCallback(
    async (incidentId: string) => {
      setError('')
      const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.message ?? 'Failed to delete incident')
      }

      setIncidents((prev) => prev.filter((item) => item.id !== incidentId))
    },
    [token]
  )

  return {
    incidents,
    loading,
    error,
    escalatingId,
    escalateIncident,
    refreshIncidents: fetchIncidents,
    createIncident,
    updateIncident,
    resolveIncident,
    deleteIncident,
  }
}
