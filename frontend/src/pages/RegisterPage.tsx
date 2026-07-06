import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { IconPicker } from '../components/IconPicker'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [icon, setIcon] = useState<{ icon_type: 'template' | 'custom'; icon_value: string }>({
    icon_type: 'template',
    icon_value: '😀',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { refresh } = useAuth()
  const navigate = useNavigate()

  async function handleRegister() {
    setError(null)
    if (!name.trim() || !password) {
      setError('お名前とパスワードを入力してください')
      return
    }
    setBusy(true)
    try {
      await api.register({ name: name.trim(), password, ...icon })
      await refresh()
      navigate('/floor/8F')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 20 }}>
      <h2>新規登録</h2>
      <label style={{ display: 'block', marginBottom: 10 }}>
        お名前
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        パスワード
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
      <button
        onClick={handleRegister}
        disabled={busy}
        style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}
      >
        登録する
      </button>
      {error && <p style={{ color: 'var(--seat-occupied)' }}>{error}</p>}
      <p style={{ marginTop: 20, fontSize: 13 }}>
        既にアカウントをお持ちの方は <Link to="/login">ログイン</Link>
      </p>
    </div>
  )
}
