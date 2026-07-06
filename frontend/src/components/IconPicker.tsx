import { useRef, useState } from 'react'
import { ICON_TEMPLATES } from '../iconTemplates'
import { IconAvatar } from './IconAvatar'
import { ImageCropper } from './ImageCropper'

type Value = { icon_type: 'template' | 'custom'; icon_value: string }

export function IconPicker({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {ICON_TEMPLATES.map((t) => {
          const selected = value.icon_type === 'template' && value.icon_value === t.emoji
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange({ icon_type: 'template', icon_value: t.emoji })}
              title={t.label}
              style={{
                padding: 4,
                borderRadius: '50%',
                border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              <IconAvatar iconType="template" iconValue={t.emoji} size={36} />
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          title={value.icon_type === 'custom' ? '切り抜き位置を変更' : '画像をアップロード'}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            border: value.icon_type === 'custom' ? '2px solid var(--accent)' : '1px dashed var(--border)',
            background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {value.icon_type === 'custom' ? (
            <img src={value.icon_value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 20 }}>＋</span>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPendingFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {value.icon_type === 'custom' && (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 12, padding: 0 }}
        >
          切り抜き位置を変更する
        </button>
      )}

      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(dataUrl) => {
            onChange({ icon_type: 'custom', icon_value: dataUrl })
            setPendingFile(null)
          }}
        />
      )}
    </div>
  )
}
