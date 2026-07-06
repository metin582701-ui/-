import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { AdminEditor } from '../components/AdminEditor'

export function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  async function handleLogin() {
    setError(null)
    try {
      await api.adminLogin(password)
      setAuthed(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (authed === null) return <p style={{ padding: 20 }}>読み込み中...</p>

  if (!authed) {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
        <h2>管理者モード ログイン</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="パスワード"
          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 10 }}
        />
        <button onClick={handleLogin} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
          ログイン
        </button>
        {error && <p style={{ color: 'var(--seat-occupied)' }}>{error}</p>}
        <p style={{ marginTop: 20, fontSize: 12 }}>
          <a href="/">← 通常画面に戻る</a>
        </p>
      </div>
    )
  }

  return <AdminEditor onLogout={() => setAuthed(false)} />
}
