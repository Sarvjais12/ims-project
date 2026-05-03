import { useState } from 'react'
import { api } from '../api'

const CATEGORIES = ['Hardware Failure', 'Software Bug', 'Network Issue', 'Human Error', 'Third Party']

export default function RcaForm({ incidentId, onDone }: { incidentId: string, onDone: () => void }) {
  const [form, setForm] = useState({
    rootCauseCategory: '', fixApplied: '',
    preventionSteps: '', incidentStart: '', incidentEnd: ''
  })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setErr(''); setMsg('')
    try {
      const res = await api.submitRca(incidentId, form)
      setMsg(`RCA saved. MTTR: ${res.data.mttrMinutes} minutes`)
      onDone()
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed')
    }
  }

  const allFilled = Object.values(form).every(v => v.trim() !== '')

  return (
    <div>
      <h2>Submit RCA</h2>
      {err && <div className="error-msg">{err}</div>}
      {msg && <div className="success-msg">{msg}</div>}

      <label>Root Cause Category</label>
      <select value={form.rootCauseCategory} onChange={e => set('rootCauseCategory', e.target.value)}>
        <option value="">Select...</option>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>

      <label>Fix Applied</label>
      <textarea value={form.fixApplied} onChange={e => set('fixApplied', e.target.value)} placeholder="What did you do to fix it?" />

      <label>Prevention Steps</label>
      <textarea value={form.preventionSteps} onChange={e => set('preventionSteps', e.target.value)} placeholder="How to prevent recurrence?" />

      <label>Incident Start</label>
      <input type="datetime-local" value={form.incidentStart} onChange={e => set('incidentStart', e.target.value)} />

      <label>Incident End</label>
      <input type="datetime-local" value={form.incidentEnd} onChange={e => set('incidentEnd', e.target.value)} />

      <button className="btn btn-primary" onClick={submit} disabled={!allFilled}>
        Submit RCA
      </button>
    </div>
  )
}