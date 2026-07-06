import { useEffect, useState } from 'react'
import type { Attendance } from '../api/types'
import { api } from '../api/client'

export function Dashboard({ refreshKey }: { refreshKey: number }) {
  const [att, setAtt] = useState<Attendance | null>(null)

  useEffect(() => {
    api.attendance().then(setAtt).catch(() => {})
  }, [refreshKey])

  if (!att) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
      <span>
        出社率: <strong>{att.attendance_rate_percent ?? '-'}%</strong>
      </span>
      <span>
        着席 {att.seated_count} / 対象 {att.denominator}名
      </span>
    </div>
  )
}
