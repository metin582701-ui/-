import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { IconPicker } from '../components/IconPicker'

export function SettingsPage() {
  const { employee, refresh, setEmployee } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(employee?.name ?? '')
  const [password, setPassword] = useState('')
  const [icon, setIcon] = useState<{ icon_type: 'template' | 'custom'; icon_value: string }>({
    icon_type: employee?.icon_type ?? 'template',
    icon_value: employee?.icon_value ?? '😀',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!employee) return null

  async function handleSave() {
    setError(null)
    setMessage(null)
    try {
      const body: Record<string, string> = { ...icon }
      if (name.trim() && name.trim() !== employee!.name) body.name = name.trim()
      if (password) body.password = password
      await api.updateMe(body)
      await refresh()
      setPassword('')
      setMessage('保存しました')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleLogout() {
    await api.logout()
    setEmployee(null)
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 20 }}>
      <h2>自分の設定</h2>
      <label style={{ display: 'block', marginBottom: 10 }}>
        お名前
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        新しいパスワード(変更する場合のみ)
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        アイコン
        <IconPicker value={icon} onChange={setIcon} />
      </label>
      <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
        保存
      </button>
      {message && <p style={{ color: 'var(--seat-vacant)' }}>{message}</p>}
      {error && <p style={{ color: 'var(--seat-occupied)' }}>{error}</p>}

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
      <button onClick={handleLogout} style={{ border: 'none', background: 'none', color: 'var(--text)' }}>
        ログアウト
      </button>
      <p style={{ marginTop: 20, fontSize: 13 }}>
        <Link to="/floor/8F">← フロア画面に戻る</Link>
      </p>
    </div>
  )
}
