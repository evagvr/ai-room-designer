const API_BASE = 'http://localhost:8000/api'

/**
 * Căutare mobilier via chat AI.
 * @param {{ query: string, room?: { length: string|number, width: string|number, height: string|number } }} params
 */
export async function searchFurniture({ query, room }) {
  const token = localStorage.getItem('authToken')

  const body = { query }
  if (room?.length && room?.width) {
    body.room = {
      length: parseFloat(room.length),
      width: parseFloat(room.width),
      height: parseFloat(room.height) || 2.5,
    }
  }

  const response = await fetch(`${API_BASE}/furniture/search/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.detail || 'Eroare la căutarea mobilierului')
  }

  return data
}
