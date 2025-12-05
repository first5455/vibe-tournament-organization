export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('API Error:', response.status, text)
    
    try {
      const json = JSON.parse(text)
      throw new Error(json.error || json.message || json.summary || 'Request failed')
    } catch (e: any) {
      // If JSON parse fails, throw the raw text as the error message
      throw new Error(text || `Request failed with status ${response.status}`)
    }
  }

  return response.json()
}

export async function getUserHistory(userId: number) {
  return api(`/users/${userId}/history`)
}
