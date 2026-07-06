import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FloorPage } from './pages/FloorPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuthProvider, useAuth } from './auth/AuthContext'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { employee, loading } = useAuth()
  if (loading) return <p style={{ padding: 20 }}>読み込み中...</p>
  if (!employee) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/floor/8F" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/floor/:floorId"
            element={
              <RequireAuth>
                <FloorPage />
              </RequireAuth>
            }
          />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
