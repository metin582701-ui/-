import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Employee } from '../api/types'
import { api } from '../api/client'

type AuthState = {
  employee: Employee | null
  loading: boolean
  refresh: () => Promise<void>
  setEmployee: (e: Employee | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const me = await api.me()
      setEmployee(me)
    } catch {
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <AuthContext.Provider value={{ employee, loading, refresh, setEmployee }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
