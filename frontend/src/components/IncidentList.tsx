import { useEffect, useState } from 'react'
import { api } from '../api'

interface Incident {
  id: string
  component_id: string
  component_type: string
  status: string
  priority: string
  signal_count: number
  first_signal_time: string
  mttr_minutes: number | null
}

export default function IncidentList({ onSelect }: { onSelect: (id: string) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([])

  const load = () => api.getIncidents().then(r => setIncidents(r.data))

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)  // live refresh every 5s
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      <h2>Active Incidents</h2>
      {incidents.length === 0 && <p style={{ color: '#718096' }}>No active incidents</p>}
      {incidents.map(inc => (
        <div className="card" key={inc.id} onClick={() => onSelect(inc.id)}>
          <div className="card-row">
            <span className="card-title">{inc.component_id}</span>
            <div className="gap" style={{ margin: 0 }}>
              <span className={`badge ${inc.priority}`}>{inc.priority}</span>
              <span className={`badge ${inc.status}`}>{inc.status}</span>
            </div>
          </div>
          <div className="card-sub">{inc.component_type} · {inc.signal_count} signal(s)</div>
          <div className="card-sub">First seen: {new Date(inc.first_signal_time).toLocaleString()}</div>
          {inc.mttr_minutes && <div className="card-sub">MTTR: {inc.mttr_minutes} min</div>}
        </div>
      ))}
    </div>
  )
}