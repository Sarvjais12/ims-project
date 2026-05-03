import { useState } from 'react'
import IncidentList from './components/IncidentList'
import IncidentDetail from './components/IncidentDetail'
import './index.css'

export default function App() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="app">
      <h1>Incident Management System</h1>
      {selected
        ? <IncidentDetail id={selected} onBack={() => setSelected(null)} />
        : <IncidentList onSelect={setSelected} />
      }
    </div>
  )
}