import type { Session } from '../types/session'
import logoAsset from '../assets/alertfrog-logo.png'

type DashboardViewProps = {
  session: Session
  onSignOut: () => void
}

const navItems = ['Dashboard', 'Incidents', 'Hosts', 'User Management', 'Settings']

const stats = [
  { title: 'Active incidents', value: '12', accent: 'danger' },
  { title: 'Monitored hosts', value: '48', accent: 'neutral' },
  { title: 'Resolved today', value: '7', accent: 'info' },
  { title: 'System health', value: '98%', accent: 'success' },
]

const incidents = [
  { id: 'INC-001', title: 'Suspicious Login Attempt', severity: 'HIGH', host: 'web-server-01', time: '5 min ago' },
  { id: 'INC-002', title: 'Port Scan Detected', severity: 'MEDIUM', host: 'db-server-03', time: '12 min ago' },
  { id: 'INC-003', title: 'Malware Signature Found', severity: 'CRITICAL', host: 'workstation-15', time: '23 min ago' },
  { id: 'INC-004', title: 'Unauthorized Access', severity: 'HIGH', host: 'api-gateway-02', time: '1 hour ago' },
]

export const DashboardView = ({ session, onSignOut }: DashboardViewProps) => {
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
              <li key={item} className={item === 'Dashboard' ? 'active' : ''}>
                {item}
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-user">
          <p className="sidebar-user__email">{session.email}</p>
          <p className="sidebar-user__role">{session.role}</p>
        </div>
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
              <h4>Recent Incidents</h4>
              <p className="muted">Realtime feed from your SOC.</p>
            </div>
            <button className="frog-button ghost">View all</button>
          </div>
          <div className="table">
            <div className="table-row head">
              <span>ID</span>
              <span>Title</span>
              <span>Severity</span>
              <span>Host</span>
              <span>Time</span>
            </div>
            {incidents.map((incident) => (
              <div key={incident.id} className="table-row">
                <span>{incident.id}</span>
                <span>{incident.title}</span>
                <span>
                  <span className={`severity ${incident.severity.toLowerCase()}`}>
                    {incident.severity}
                  </span>
                </span>
                <span>{incident.host}</span>
                <span>{incident.time}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
