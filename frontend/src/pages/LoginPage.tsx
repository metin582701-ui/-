import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const { refresh } = useAuth()
  const navigate = useNavigate()

  async function handleLogin() {
    setError(null)
    if (!name.trim() || !password) {
      setError('お名前とパスワードを入力してください')
      return
    }
    setBusy(true)
    try {
      await api.login(name.trim(), password)
      await refresh()
      navigate('/floor/8F')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
      <h2>ログイン</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="お名前"
        style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 10 }}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        placeholder="パスワード"
        style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 10 }}
      />
      <button
        onClick={handleLogin}
        disabled={busy}
        style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}
      >
        ログイン
      </button>
      {error && <p style={{ color: 'var(--seat-occupied)' }}>{error}</p>}
      <p style={{ marginTop: 20, fontSize: 13 }}>
        アカウントをお持ちでない方は <Link to="/register">新規登録</Link>
      </p>
      <p style={{ marginTop: 6, fontSize: 13 }}>
        <button
          onClick={() => setShowReset((v) => !v)}
          style={{ border: 'none', background: 'none', color: 'var(--accent)', padding: 0, fontSize: 13 }}
        >
          パスワードを忘れた場合はこちら
        </button>
      </p>
      {showReset && <ResetPasswordForm onClose={() => setShowReset(false)} />}
    </div>
  )
}

function ResetPasswordForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleReset() {
    setError(null)
    if (!name.trim() || !newPassword || !adminPassword) {
      setError('すべての項目を入力してください')
      return
    }
    setBusy(true)
    try {
      await api.resetPasswordWithAdminAuth(name.trim(), newPassword, adminPassword)
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: 14, marginTop: 0 }}>パスワードの再設定</h3>
      <p style={{ fontSize: 12, color: 'var(--text)', marginTop: 0 }}>
        管理者パスワードが分かる方が、代わりに新しいパスワードを設定できます。
      </p>
      {done ? (
        <>
          <p style={{ color: 'var(--seat-vacant)', fontSize: 13 }}>パスワードを再設定しました。ログインしてください。</p>
          <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'none' }}>
            閉じる
          </button>
        </>
      ) : (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新しいパスワード"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}
          />
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="管理者パスワード"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReset}
              disabled={busy}
              style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}
            >
              再設定する
            </button>
            <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'none' }}>
              キャンセル
            </button>
          </div>
          {error && <p style={{ color: 'var(--seat-occupied)', fontSize: 13 }}>{error}</p>}
        </>
      )}
    </div>
  )
}
