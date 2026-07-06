import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Employee, Floor, Room } from '../api/types'
import { FloorPlan } from '../components/FloorPlan'
import { RoomModal } from '../components/RoomModal'
import { Dashboard } from '../components/Dashboard'
import { IconAvatar } from '../components/IconAvatar'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../auth/AuthContext'

export function FloorPage() {
  const { floorId = '8F' } = useParams()
  const navigate = useNavigate()
  const { employee, refresh } = useAuth()
  const [floorList, setFloorList] = useState<Floor[]>([])
  const [floor, setFloor] = useState<Floor | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [presence, setPresence] = useState<Employee[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listFloors().then(setFloorList).catch(() => {})
  }, [refreshKey])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [f, r, p] = await Promise.all([api.getFloor(floorId), api.listRooms(floorId), api.listFloorPresence(floorId)])
      setFloor(f)
      setRooms(r)
      setPresence(p)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [floorId])

  useEffect(() => {
    load()
  }, [load])

  useRealtime((e) => {
    if (e.event === 'presence_updated') {
      const p = e.payload as { floor_id?: string }
      if (p.floor_id === floorId) load()
      setRefreshKey((k) => k + 1)
    }
    if (e.event === 'reservation_created' || e.event === 'reservation_cancelled') {
      setRefreshKey((k) => k + 1)
    }
  })

  async function handleBackgroundClick(x: number, y: number) {
    if (!employee) return
    await api.setPresence(floorId, x, y)
    await refresh()
    await load()
  }

  async function handleCheckout() {
    if (!confirm('退室しますか?(アイコンが消えます)')) return
    await api.clearPresence()
    await refresh()
    await load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>オフィスレイアウト管理</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {floorList.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(`/floor/${f.id}`)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: f.id === floorId ? 'var(--accent)' : 'none',
                color: f.id === floorId ? '#fff' : 'var(--text)', fontWeight: 600,
              }}
            >
              {f.id}
            </button>
          ))}
        </div>
        {floor && <Dashboard refreshKey={refreshKey} />}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {employee && (
            <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <IconAvatar iconType={employee.icon_type} iconValue={employee.icon_value} size={24} />
              {employee.name}
            </Link>
          )}
        </div>
        <a href="/admin" style={{ fontSize: 12, color: 'var(--text)' }}>
          管理者モード
        </a>
      </header>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {error && <p style={{ padding: 16, color: 'var(--seat-occupied)' }}>{error}</p>}
        {!error && !floor && <p style={{ padding: 16 }}>読み込み中...</p>}
        {floor && (
          <FloorPlan
            floor={floor}
            rooms={rooms}
            presence={presence}
            myEmployeeId={employee?.id ?? null}
            onRoomClick={setSelectedRoom}
            onBackgroundClick={handleBackgroundClick}
            onMyIconContextMenu={handleCheckout}
          />
        )}
        <p style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 12, color: 'var(--text)', opacity: 0.7 }}>
          自分の座る場所を左クリックでアイコン設置・移動 / 自分のアイコンを右クリックで退室
        </p>
      </main>

      {selectedRoom && (
        <RoomModal
          room={selectedRoom}
          myName={employee?.name ?? ''}
          onClose={() => setSelectedRoom(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
