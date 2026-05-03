import { useEffect, useState } from 'react'
import { api } from '../api'
import RcaForm from './RcaForm'

const TRANSITIONS: Record<string, string> = {
  OPEN: 'INVESTIGATING', INVESTIGATING: 'RESOLVED', RESOLVED: 'CLOSED'
}

export default function IncidentDetail({ id, onBack }: { id: string, onBack: () => void }) {
  const [incident, setIncident] = useState<any>(null)
  const [showRca, setShowRca] = useState(false)
  const [err, setErr] = useState('')

  const load = () => api.getIncident(id).then(r => setIncident(r.data))
  useEffect(() => { load() }, [id])

  const transition = async () => {
  setErr('')
  if (!incident) return        // ← add this line
  const next = TRANSITIONS[incident.status]
  if (!next) return
  try {
    await api.transition(id, next)
    load()
  } catch (e: any) {
    setErr(e.response?.data?.error || 'Failed')
  }
}

  if (!incident) return <p style={{color:'#94a3b8', padding:'20px'}}>Loading...</p>

  return (
    <div>
      <span className="back" onClick={onBack}>← Back</span>
      <div className="card-row" style={{ marginBottom: 16 }}>
        <h2>{incident.component_id}</h2>
        <div className="gap" style={{ margin: 0 }}>
          <span className={`badge ${incident.priority}`}>{incident.priority}</span>
          <span className={`badge ${incident.status}`}>{incident.status}</span>
        </div>
      </div>

      {err && <div className="error-msg">{err}</div>}

      <div className="gap">
        {TRANSITIONS[incident.status] && (
          <button className="btn btn-primary" onClick={transition}>
            Move to {TRANSITIONS[incident.status]}
          </button>
        )}
        {incident.status === 'RESOLVED' && (
          <button className="btn btn-ghost" onClick={() => setShowRca(!showRca)}>
            {showRca ? 'Hide RCA' : 'Fill RCA'}
          </button>
        )}
      </div>

      {showRca && <RcaForm incidentId={id} onDone={load} />}

      <h2 style={{ marginTop: 20 }}>Raw Signals ({incident.signals?.length})</h2>
      <div className="signal-list">
        {incident.signals?.map((s: any) => (
          <div className="signal-item" key={s._id}>
            #{s.signalNumber} · {s.message} · {new Date(s.timestamp).toLocaleString()}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: '#718096' }}>
        <div>Type: {incident.component_type}</div>
        <div>First signal: {new Date(incident.first_signal_time).toLocaleString()}</div>
        {incident.mttr_minutes && <div>MTTR: {incident.mttr_minutes} min</div>}
      </div>
    </div>
  )
}