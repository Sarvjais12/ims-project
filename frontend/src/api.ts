import axios from 'axios'

const BASE = 'http://localhost:3000/api'

// Auto-login on first load and store token
async function getToken(): Promise<string> {
  let token = sessionStorage.getItem('ims_token')
  if (!token) {
    const res = await axios.post(`${BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    })
    token = res.data.token
    sessionStorage.setItem('ims_token', token!)
  }
  return token!
}

async function authHeaders() {
  const token = await getToken()
  return { Authorization: `Bearer ${token}` }
}

export const api = {
  getIncidents: async () => axios.get(`${BASE}/incidents`, { headers: await authHeaders() }),
  getIncident: async (id: string) => axios.get(`${BASE}/incidents/${id}`, { headers: await authHeaders() }),
  transition: async (id: string, status: string) =>
    axios.put(`${BASE}/incidents/${id}/state`, { status }, { headers: await authHeaders() }),
  submitRca: async (id: string, rca: object) =>
    axios.post(`${BASE}/incidents/${id}/rca`, rca, { headers: await authHeaders() }),
  sendSignal: async (data: object) =>
    axios.post(`${BASE}/signals`, data, { headers: await authHeaders() })
}