export type Incident = {
  id: string
  title: string
  description: string
  severity: string
  status: string
  cve?: string | null
  affectedSystem?: string | null
  assignedUserId: string
  assignedUserName: string
  assignedUserRole: string
  registrantUserId: string
  registrantName: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
  canEscalate: boolean
}
