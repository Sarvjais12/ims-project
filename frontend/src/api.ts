import axios from 'axios'

const BASE = 'http://localhost:3000/api'

export const api = {
  getIncidents: () => axios.get(`${BASE}/incidents`),
  getIncident: (id: string) => axios.get(`${BASE}/incidents/${id}`),
  transition: (id: string, status: string) =>
    axios.put(`${BASE}/incidents/${id}/state`, { status }),
  submitRca: (id: string, rca: object) =>
    axios.post(`${BASE}/incidents/${id}/rca`, rca),
  sendSignal: (data: object) => axios.post(`${BASE}/signals`, data)
}