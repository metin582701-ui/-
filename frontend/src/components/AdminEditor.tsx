import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Employee, Floor, Room } from '../api/types'
import { FloorPlan } from './FloorPlan'
import { IconAvatar } from './IconAvatar'
import { useRealtime } from '../hooks/useRealtime'

type Mode = 'select' | 'add_room'

export function AdminEditor({ onLogout }: { onLogout: () => void }) {
  const [floorList, setFloorList] = useState<Floor[]>([])
  const [floorId, setFloorId] = useState('8F')
  const [floor, setFloor] = useState<Floor | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [presence, setPresence] = useState<Employee[]>([])
  const [mode, setMode] = useState<Mode>('select')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [bgFile, setBgFile] = useState<File | null>(null)
  const [bgBusy, setBgBusy] = useState(false)
  const [empCount, setEmpCount] = useState<number>(0)
  const [newPassword, setNewPassword] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [addingFloor, setAddingFloor] = useState(false)
  const [newFloorId, setNewFloorId] = useState('')
  const [newFloorName, setNewFloorName] = useState('')

  const loadFloorList = useCallback(async () => {
    setFloorList(await api.listFloors())
  }, [])

  const load = useCallback(async () => {
    try {
      const [f, r, p] = await Promise.all([api.getFloor(floorId), api.listRooms(floorId), api.listFloorPresence(floorId)])
      setFloor(f)
      setRooms(r)
      setPresence(p)
    } catch {
      setFloor(null)
      setRooms([])
      setPresence([])
    }
  }, [floorId])

  useEffect(() => {
    load()
    setSelectedRoom(null)
  }, [load])

  useRealtime((e) => {
    if (e.event === 'presence_updated') {
      const p = e.payload as { floor_id?: string }
      if (p.floor_id === floorId) load()
    }
  })

  useEffect(() => {
    loadFloorList()
  }, [loadFloorList])

  useEffect(() => {
    api.adminListEmployees().then(setEmployees).catch(() => {})
  }, [])

  useEffect(() => {
    api.adminGetSettings().then((s) => setEmpCount(s.total_employee_count)).catch(() => {})
  }, [])

  async function handleUploadBackground() {
    if (!bgFile) return
    const targetFloorId = addingFloor ? newFloorId.trim() : floorId
    const targetFloorName = addingFloor ? newFloorName.trim() || targetFloorId : floorId
    if (addingFloor && !targetFloorId) {
      setMessage('フロアIDを入力してください(例: 10F)')
      return
    }
    setBgBusy(true)
    setMessage(null)
    try {
      await api.adminUploadBackground(targetFloorId, targetFloorName, bgFile)
      setMessage(addingFloor ? `フロア「${targetFloorId}」を追加しました` : '背景画像を更新しました')
      await loadFloorList()
      setFloorId(targetFloorId)
      setAddingFloor(false)
      setNewFloorId('')
      setNewFloorName('')
      setBgFile(null)
      await load()
    } catch (e) {
      setMessage('エラー: ' + (e as Error).message)
    } finally {
      setBgBusy(false)
    }
  }

  async function handleBackgroundClick(x: number, y: number) {
    if (mode !== 'add_room') return
    const room = await api.adminAddRoom(floorId, { x: x - 30, y: y - 20, w: 60, h: 40 })
    await load()
    setSelectedRoom(room)
  }

  async function handleRoomMoved(roomId: string, x: number, y: number) {
    await api.adminUpdateRoom(roomId, { x, y })
    await load()
    if (selectedRoom?.id === roomId) setSelectedRoom((r) => (r ? { ...r, x, y } : r))
  }

  async function handleRoomResized(roomId: string, w: number, h: number) {
    await api.adminUpdateRoom(roomId, { w, h })
    await load()
    if (selectedRoom?.id === roomId) setSelectedRoom((r) => (r ? { ...r, w, h } : r))
  }

  async function handleRoomDeleted(roomId: string) {
    await api.adminDeleteRoom(roomId)
    if (selectedRoom?.id === roomId) setSelectedRoom(null)
    await load()
  }

  async function handleSaveSettings() {
    await api.adminUpdateSettings({
      total_employee_count: empCount,
      ...(newPassword ? { password: newPassword } : {}),
    })
    setMessage('設定を保存しました')
    setNewPassword('')
  }

  async function handleDeleteEmployee(id: string) {
    if (!confirm('この社員アカウントを削除しますか?')) return
    await api.adminDeleteEmployee(id)
    setEmployees(await api.adminListEmployees())
  }

  async function handleResetPassword(id: string) {
    const pw = prompt('新しいパスワードを入力してください')
    if (!pw) return
    await api.adminResetEmployeePassword(id, pw)
    setMessage('パスワードをリセットしました')
  }

  async function handleForceCheckout(employee: Employee) {
    if (!confirm(`${employee.name} さんを退室扱いにしますか?(アイコンが消えます)`)) return
    await api.adminClearPresence(employee.id)
    await load()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', height: '100vh', minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <header style={{ display: 'flex', gap: 8, padding: 10, borderBottom: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>管理者モード</strong>
          {floorList.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFloorId(f.id); setAddingFloor(false) }}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: f.id === floorId && !addingFloor ? 'var(--accent)' : 'none', color: f.id === floorId && !addingFloor ? '#fff' : 'var(--text)',
              }}
            >
              {f.id}
            </button>
          ))}
          <button
            onClick={() => setAddingFloor(true)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px dashed var(--border)',
              background: addingFloor ? 'var(--accent)' : 'none', color: addingFloor ? '#fff' : 'var(--text)',
            }}
          >
            +フロア追加
          </button>
          <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            {(['select', 'add_room'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: mode === m ? 'var(--accent)' : 'none', color: mode === m ? '#fff' : 'var(--text)',
                }}
              >
                {m === 'select' ? '選択/ドラッグ移動' : '+会議室・テーブル追加'}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <a href="/">通常画面</a>
            <button
              onClick={async () => {
                await api.adminLogout()
                onLogout()
              }}
              style={{ border: 'none', background: 'none', color: 'var(--text)' }}
            >
              ログアウト
            </button>
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {addingFloor ? (
            <p style={{ padding: 16 }}>右のパネルで新しいフロアのIDと画像を指定してアップロードしてください。</p>
          ) : floor ? (
            <FloorPlan
              floor={floor}
              rooms={rooms}
              presence={presence}
              selectedRoomId={selectedRoom?.id ?? null}
              onBackgroundClick={handleBackgroundClick}
              onRoomClick={mode === 'select' ? (r) => setSelectedRoom(r) : undefined}
              onRoomMoved={handleRoomMoved}
              onRoomResized={handleRoomResized}
              onRoomDeleted={handleRoomDeleted}
              onAdminIconContextMenu={handleForceCheckout}
              editableRooms={mode === 'select'}
            />
          ) : (
            <p style={{ padding: 16 }}>このフロアはまだ背景画像が未設定です。右のパネルからアップロードしてください。</p>
          )}
        </div>
      </div>

      <aside style={{ borderLeft: '1px solid var(--border)', padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <h3>背景レイアウト画像{addingFloor ? '(新規フロア)' : `(${floorId})`}</h3>
          {addingFloor && (
            <>
              <label style={{ display: 'block', marginBottom: 8 }}>
                フロアID(例: 10F)
                <input value={newFloorId} onChange={(e) => setNewFloorId(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }} />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                フロア名(省略可)
                <input value={newFloorName} onChange={(e) => setNewFloorName(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }} placeholder={newFloorId} />
              </label>
            </>
          )}
          <input type="file" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleUploadBackground}
              disabled={!bgFile || bgBusy}
              style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}
            >
              アップロード
            </button>
            {addingFloor && (
              <button
                onClick={() => { setAddingFloor(false); setNewFloorId(''); setNewFloorName(''); setBgFile(null) }}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text)' }}
              >
                キャンセル
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text)', marginTop: 6 }}>
            「選択/ドラッグ移動」モードで会議室・テーブルのボタンをドラッグして位置調整、ダブルクリックしたままドラッグでサイズ変更、右クリックで削除できます。
            社員のアイコンを右クリックすると、退室し忘れている人を強制的に退室させられます。
          </p>
        </section>

        <section>
          <h3>全社設定</h3>
          <label style={{ display: 'block', marginBottom: 8 }}>
            全社在籍人数
            <input type="number" value={empCount} onChange={(e) => setEmpCount(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }} />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            管理者パスワード変更(変更する場合のみ)
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }} />
          </label>
          <button onClick={handleSaveSettings} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
            設定を保存
          </button>
        </section>

        {selectedRoom && (
          <RoomEditor
            key={`${selectedRoom.id}-${selectedRoom.x}-${selectedRoom.y}-${selectedRoom.w}-${selectedRoom.h}`}
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
            onChanged={async () => {
              await load()
              setSelectedRoom(null)
            }}
          />
        )}

        <section>
          <h3>社員アカウント管理</h3>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {employees.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <IconAvatar iconType={e.icon_type} iconValue={e.icon_value} size={22} />
                <span style={{ flex: 1 }}>{e.name}</span>
                <button onClick={() => handleResetPassword(e.id)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 12 }}>
                  PWリセット
                </button>
                <button onClick={() => handleDeleteEmployee(e.id)} style={{ border: 'none', background: 'none', color: 'var(--seat-occupied)', fontSize: 12 }}>
                  削除
                </button>
              </div>
            ))}
          </div>
        </section>

        {message && <p style={{ fontSize: 13 }}>{message}</p>}
      </aside>
    </div>
  )
}

function RoomEditor({ room, onClose, onChanged }: { room: Room; onClose: () => void; onChanged: () => void }) {
  const [type, setType] = useState(room.type ?? '')
  const [name, setName] = useState(room.name ?? '')
  const [capacity, setCapacity] = useState<string>(room.capacity ? String(room.capacity) : '')
  const [x, setX] = useState(room.x)
  const [y, setY] = useState(room.y)
  const [w, setW] = useState(room.w)
  const [h, setH] = useState(room.h)

  async function save() {
    await api.adminUpdateRoom(room.id, {
      type: type || undefined,
      name: name || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      x, y, w, h,
    })
    onChanged()
  }

  return (
    <section>
      <h3>会議室・テーブル 編集</h3>
      <label style={{ display: 'block', marginBottom: 8 }}>
        種別
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }}>
          <option value="">未設定</option>
          <option value="meeting_room">会議室</option>
          <option value="reception">応接室</option>
          <option value="table">テーブル</option>
        </select>
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        名称
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }} placeholder="例: 第一会議室" />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        定員(任意)
        <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label>
          x
          <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6 }} />
        </label>
        <label>
          y
          <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6 }} />
        </label>
        <label>
          幅
          <input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6 }} />
        </label>
        <label>
          高さ
          <input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6 }} />
        </label>
      </div>
      <button onClick={save} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
        保存
      </button>
      <button
        onClick={async () => {
          await api.adminDeleteRoom(room.id)
          onChanged()
        }}
        style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--seat-occupied)', color: 'var(--seat-occupied)', background: 'none' }}
      >
        削除
      </button>
      <button onClick={onClose} style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'none' }}>
        閉じる
      </button>
    </section>
  )
}
