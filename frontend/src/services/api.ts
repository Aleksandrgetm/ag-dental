const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('VITE_API_URL is not configured')
}

export interface HealthResponse {
  status: string
  service: string
  database: string
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`)

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json()
}