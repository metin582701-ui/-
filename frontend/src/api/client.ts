import type { Attendance, Employee, Floor, Reservation, Room } from './types'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  listFloors: () => request<Floor[]>('/api/floors'),
  getFloor: (floorId: string) => request<Floor>(`/api/floors/${floorId}`),
  listRooms: (floorId: string) => request<Room[]>(`/api/floors/${floorId}/rooms`),
  floorOccupancy: (floorId: string) => request<{ floor_id: string; occupied: number }>(`/api/floors/${floorId}/occupancy`),

  listReservations: (roomId: string, date: string) =>
    request<Reservation[]>(`/api/rooms/${roomId}/reservations?date=${date}`),
  reservationHistory: (roomId: string, dateFrom?: string, dateTo?: string) =>
    request<Reservation[]>(
      `/api/rooms/${roomId}/reservations/history?` +
        new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }),
    ),
  createReservation: (
    roomId: string,
    body: { reserver_name: string; date: string; start_time: string; end_time: string; attendee_count: number; overview?: string },
  ) => request<Reservation>(`/api/rooms/${roomId}/reservations`, { method: 'POST', body: JSON.stringify(body) }),
  cancelReservation: (reservationId: string, requesterName: string) =>
    request<{ ok: boolean }>(
      `/api/rooms/reservations/${reservationId}?requester_name=${encodeURIComponent(requesterName)}`,
      { method: 'DELETE' },
    ),

  // --- 自分の認証・プロフィール ---
  register: (body: { name: string; password: string; icon_type: string; icon_value: string }) =>
    request<Employee>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (name: string, password: string) =>
    request<Employee>('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) }),
  resetPasswordWithAdminAuth: (name: string, newPassword: string, adminPassword: string) =>
    request<{ ok: boolean }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ name, new_password: newPassword, admin_password: adminPassword }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<Employee>('/api/auth/me'),
  updateMe: (body: Partial<{ name: string; password: string; icon_type: string; icon_value: string }>) =>
    request<Employee>('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) }),

  listEmployees: () => request<Employee[]>('/api/employees'),
  attendance: (floorId?: string) =>
    request<Attendance>(`/api/employees/attendance${floorId ? `?floor_id=${floorId}` : ''}`),

  // --- 在席位置(アイコン) ---
  listFloorPresence: (floorId: string) => request<Employee[]>(`/api/presence/floors/${floorId}`),
  setPresence: (floorId: string, x: number, y: number) =>
    request<Employee>('/api/presence', { method: 'PUT', body: JSON.stringify({ floor_id: floorId, x, y }) }),
  clearPresence: () => request<Employee>('/api/presence', { method: 'DELETE' }),

  // --- 管理者 ---
  adminLogin: (password: string) =>
    request<{ ok: boolean }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  adminLogout: () => request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),
  adminCheck: () => request<{ ok: boolean }>('/api/admin/check'),
  adminGetSettings: () => request<{ total_employee_count: number }>('/api/admin/settings'),
  adminUpdateSettings: (body: { password?: string; total_employee_count?: number }) =>
    request<{ ok: boolean }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  adminUploadBackground: async (floorId: string, floorName: string, file: File) => {
    const form = new FormData()
    form.append('floor_name', floorName)
    form.append('file', file)
    const res = await fetch(`/api/admin/floors/${floorId}/background?floor_name=${encodeURIComponent(floorName)}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || res.statusText)
    }
    return res.json()
  },
  adminAddRoom: (
    floorId: string,
    body: { x: number; y: number; w: number; h: number; type?: string; name?: string; capacity?: number },
  ) => request<Room>(`/api/admin/floors/${floorId}/rooms`, { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateRoom: (
    roomId: string,
    body: Partial<{ type: string; name: string; capacity: number; x: number; y: number; w: number; h: number }>,
  ) => request<Room>(`/api/admin/rooms/${roomId}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteRoom: (roomId: string) => request<{ ok: boolean }>(`/api/admin/rooms/${roomId}`, { method: 'DELETE' }),
  adminListEmployees: () => request<Employee[]>('/api/admin/employees'),
  adminDeleteEmployee: (employeeId: string) =>
    request<{ ok: boolean }>(`/api/admin/employees/${employeeId}`, { method: 'DELETE' }),
  adminResetEmployeePassword: (employeeId: string, newPassword: string) =>
    request<{ ok: boolean }>(
      `/api/admin/employees/${employeeId}/reset-password?new_password=${encodeURIComponent(newPassword)}`,
      { method: 'PUT' },
    ),
}
