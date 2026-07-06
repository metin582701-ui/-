import { useEffect, useState, type CSSProperties } from 'react'
import type { Reservation, Room } from '../api/types'
import { api } from '../api/client'
import { Modal } from './Modal'

const ROOM_LABEL: Record<string, string> = {
  meeting_room: '会議室',
  reception: '応接室',
  table: 'テーブル',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function RoomModal({ room, myName, onClose, onChanged }: { room: Room; myName: string; onClose: () => void; onChanged: () => void }) {
  const [date, setDate] = useState(today())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    reserver_name: myName,
    start_time: nowHHMM(),
    end_time: nowHHMM(),
    attendee_count: 1,
    overview: '',
  })

  async function load() {
    const list = await api.listReservations(room.id, date)
    setReservations(list.sort((a, b) => a.start_time.localeCompare(b.start_time)))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, room.id])

  async function loadHistory() {
    const list = await api.reservationHistory(room.id)
    setHistory(list)
  }

  const nowStr = date === today() ? nowHHMM() : null
  const currentReservation = nowStr ? reservations.find((r) => r.start_time <= nowStr && nowStr < r.end_time) : null

  async function handleCreate() {
    setError(null)
    if (!form.reserver_name.trim()) {
      setError('予約者名を入力してください')
      return
    }
    if (form.end_time <= form.start_time) {
      setError('終了時刻は開始時刻より後にしてください')
      return
    }
    setBusy(true)
    try {
      await api.createReservation(room.id, { ...form, reserver_name: form.reserver_name.trim(), date })
      await load()
      onChanged()
      setShowForm(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(r: Reservation) {
    if (r.reserver_name !== myName) {
      setError('予約者本人のみ取消できます(自分の情報設定でお名前を設定してください)')
      return
    }
    setBusy(true)
    try {
      await api.cancelReservation(r.id, myName)
      await load()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const typeLabel = room.type ? ROOM_LABEL[room.type] : '未設定'

  return (
    <Modal title={room.name || typeLabel} onClose={onClose} width={520}>
      <p style={{ color: 'var(--text)', marginBottom: 8 }}>
        種別: {typeLabel}
        {room.capacity ? ` / 定員: ${room.capacity}名` : ''}
      </p>

      {currentReservation && (
        <div style={{ background: 'var(--accent-bg)', borderRadius: 6, padding: 10, marginBottom: 12 }}>
          <strong>現在使用中</strong>: {currentReservation.start_time}-{currentReservation.end_time} {currentReservation.reserver_name}様
          {currentReservation.overview ? `(${currentReservation.overview})` : ''}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label>タイムライン日付:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border)' }} />
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, marginBottom: 12, maxHeight: 180, overflowY: 'auto' }}>
        {reservations.length === 0 && <p style={{ padding: 10, margin: 0, color: 'var(--text)' }}>この日の予約はありません</p>}
        {reservations.map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
            <span>
              {r.start_time}-{r.end_time} {r.reserver_name}様({r.attendee_count}名){r.overview ? ` ${r.overview}` : ''}
            </span>
            {r.reserver_name === myName && (
              <button onClick={() => handleCancel(r)} disabled={busy} style={{ border: 'none', background: 'none', color: 'var(--seat-occupied)' }}>
                取消
              </button>
            )}
          </div>
        ))}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
          新規予約を追加
        </button>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <label>
              予約者名
              <input value={form.reserver_name} onChange={(e) => setForm({ ...form, reserver_name: e.target.value })} style={inputStyle} />
            </label>
            <label>
              人数
              <input type="number" min={1} value={form.attendee_count} onChange={(e) => setForm({ ...form, attendee_count: Number(e.target.value) })} style={inputStyle} />
            </label>
            <label>
              開始時刻
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} style={inputStyle} />
            </label>
            <label>
              終了時刻
              <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} style={inputStyle} />
            </label>
          </div>
          <label style={{ display: 'block', marginBottom: 8 }}>
            概要
            <input value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} style={{ ...inputStyle, width: '100%' }} placeholder="会議名・利用目的など" />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={busy} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
              予約する
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text)' }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--seat-occupied)', marginTop: 10 }}>{error}</p>}

      <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
      <button
        onClick={() => {
          setShowHistory((v) => !v)
          if (!history) loadHistory()
        }}
        style={{ border: 'none', background: 'none', color: 'var(--accent)', padding: 0 }}
      >
        {showHistory ? '▲ 予約履歴を閉じる' : '▼ 予約履歴を見る(直近2週間)'}
      </button>
      {showHistory && (
        <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
          {(history ?? []).length === 0 && <p style={{ padding: 10, margin: 0 }}>履歴がありません</p>}
          {(history ?? []).map((r) => (
            <div key={r.id} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', opacity: r.status === 'cancelled' ? 0.5 : 1 }}>
              {r.date} {r.start_time}-{r.end_time} {r.reserver_name}様({r.attendee_count}名){r.overview ? ` ${r.overview}` : ''}
              {r.status === 'cancelled' ? ' [取消済]' : ''}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

const inputStyle: CSSProperties = { width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--border)', marginTop: 4 }
