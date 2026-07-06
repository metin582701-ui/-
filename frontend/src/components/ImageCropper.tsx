import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'

const VIEWPORT_SIZE = 260
const OUTPUT_SIZE = 128

type Props = {
  file: File
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}

export function ImageCropper({ file, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [ready, setReady] = useState(false)
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 }) // 画像中心からのずれ(viewport px)
  const dragState = useRef<{ startX: number; startY: number; origOffset: { x: number; y: number } } | null>(null)

  useEffect(() => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        imgRef.current = img
        const fitScale = Math.max(VIEWPORT_SIZE / img.width, VIEWPORT_SIZE / img.height)
        setMinScale(fitScale)
        setScale(fitScale)
        setOffset({ x: 0, y: 0 })
        setReady(true)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }, [file])

  useEffect(() => {
    if (!ready) return
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scale, offset])

  function draw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)

    const w = img.width * scale
    const h = img.height * scale
    const cx = VIEWPORT_SIZE / 2 + offset.x
    const cy = VIEWPORT_SIZE / 2 + offset.y
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)

    // 円の外側を半透明マスクで覆う
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.rect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)
    ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, 0, Math.PI * 2, true)
    ctx.fill('evenodd')
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  function clampOffset(next: { x: number; y: number }, s: number) {
    const img = imgRef.current
    if (!img) return next
    const w = img.width * s
    const h = img.height * s
    const maxX = Math.max(0, (w - VIEWPORT_SIZE) / 2)
    const maxY = Math.max(0, (h - VIEWPORT_SIZE) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, origOffset: offset }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    setOffset(clampOffset({ x: dragState.current.origOffset.x + dx, y: dragState.current.origOffset.y + dy }, scale))
  }

  function handlePointerUp() {
    dragState.current = null
  }

  function handleScaleChange(next: number) {
    setScale(next)
    setOffset((prev) => clampOffset(prev, next))
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    const out = document.createElement('canvas')
    out.width = OUTPUT_SIZE
    out.height = OUTPUT_SIZE
    const ctx = out.getContext('2d')!
    const outScale = scale * (OUTPUT_SIZE / VIEWPORT_SIZE)
    const w = img.width * outScale
    const h = img.height * outScale
    const cx = OUTPUT_SIZE / 2 + offset.x * (OUTPUT_SIZE / VIEWPORT_SIZE)
    const cy = OUTPUT_SIZE / 2 + offset.y * (OUTPUT_SIZE / VIEWPORT_SIZE)
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
    onConfirm(out.toDataURL('image/png'))
  }

  return (
    <Modal title="アイコンの切り抜き位置を調整" onClose={onCancel} width={340}>
      {ready ? (
        <>
          <canvas
            ref={canvasRef}
            width={VIEWPORT_SIZE}
            height={VIEWPORT_SIZE}
            style={{ touchAction: 'none', cursor: 'grab', borderRadius: 8, background: '#222' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <p style={{ fontSize: 12, color: 'var(--text)', margin: '8px 0' }}>ドラッグで位置を移動、スライダーで拡大縮小できます。</p>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={minScale / 50}
            value={scale}
            onChange={(e) => handleScaleChange(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleConfirm} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff' }}>
              決定
            </button>
            <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text)' }}>
              キャンセル
            </button>
          </div>
        </>
      ) : (
        <p>読み込み中...</p>
      )}
    </Modal>
  )
}
