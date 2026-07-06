import { useRef, useState } from 'react'
import type { Employee, Floor, Room } from '../api/types'
import { IconAvatar } from './IconAvatar'

const ROOM_LABEL: Record<string, string> = {
  meeting_room: '会議室',
  reception: '応接室',
  table: 'テーブル',
}

const ICON_SIZE = 26

type Props = {
  floor: Floor
  rooms: Room[]
  presence: Employee[]
  myEmployeeId?: string | null
  onRoomClick?: (room: Room) => void
  onBackgroundClick?: (x: number, y: number) => void
  onMyIconContextMenu?: () => void
  /** 設定時、全員のアイコン右クリックでこれが呼ばれる(管理者モード用: 他人の退室し忘れを解除できる) */
  onAdminIconContextMenu?: (employee: Employee) => void
  onRoomMoved?: (roomId: string, x: number, y: number) => void
  onRoomResized?: (roomId: string, w: number, h: number) => void
  onRoomDeleted?: (roomId: string) => void
  selectedRoomId?: string | null
  editableRooms?: boolean
}

const DOUBLE_CLICK_MS = 400
const CLICK_MOVE_THRESHOLD = 4 // このpx(SVGユニット)未満の移動は「クリック」とみなしドラッグ扱いにしない
const MIN_ROOM_SIZE = 16

export function FloorPlan({
  floor,
  rooms,
  presence,
  myEmployeeId,
  onRoomClick,
  onBackgroundClick,
  onMyIconContextMenu,
  onAdminIconContextMenu,
  onRoomMoved,
  onRoomResized,
  onRoomDeleted,
  selectedRoomId,
  editableRooms,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragRoomId, setDragRoomId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ dx: 0, dy: 0 })
  const dragMoved = useRef(false)

  const [resizeRoomId, setResizeRoomId] = useState<string | null>(null)
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null)
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 })

  // 直前が「動きのない純粋なクリック」だった場合のみ、次のmousedownとの間隔でダブルクリックを判定する
  const lastGenuineClick = useRef<{ roomId: string; time: number } | null>(null)

  const padding = 20
  const viewBox = `${-padding} ${-padding} ${floor.width + padding * 2} ${floor.height + padding * 2}`

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()?.inverse())
  }

  function handleRoomMouseDown(e: React.MouseEvent, room: Room) {
    if (!editableRooms) return
    e.stopPropagation()
    const loc = toSvgPoint(e.clientX, e.clientY)

    const now = Date.now()
    const isDoubleClick =
      lastGenuineClick.current &&
      lastGenuineClick.current.roomId === room.id &&
      now - lastGenuineClick.current.time < DOUBLE_CLICK_MS
    lastGenuineClick.current = null

    if (isDoubleClick) {
      // ダブルクリック&ドラッグでサイズ変更
      resizeStart.current = { mx: loc.x, my: loc.y, w: room.w, h: room.h }
      setResizeRoomId(room.id)
      setResizeSize({ w: room.w, h: room.h })
    } else {
      dragMoved.current = false
      dragOffset.current = { dx: loc.x - room.x, dy: loc.y - room.y }
      setDragRoomId(room.id)
      setDragPos({ x: room.x, y: room.y })
    }
  }

  function handleRoomContextMenu(e: React.MouseEvent, room: Room) {
    if (!editableRooms || !onRoomDeleted) return
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`「${room.name || '未設定'}」を削除しますか?`)) {
      onRoomDeleted(room.id)
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (resizeRoomId) {
      const loc = toSvgPoint(e.clientX, e.clientY)
      const dx = loc.x - resizeStart.current.mx
      const dy = loc.y - resizeStart.current.my
      setResizeSize({
        w: Math.max(MIN_ROOM_SIZE, resizeStart.current.w + dx),
        h: Math.max(MIN_ROOM_SIZE, resizeStart.current.h + dy),
      })
      return
    }
    if (dragRoomId) {
      const loc = toSvgPoint(e.clientX, e.clientY)
      const nx = loc.x - dragOffset.current.dx
      const ny = loc.y - dragOffset.current.dy
      setDragPos((prev) => {
        if (prev && (Math.abs(nx - prev.x) > CLICK_MOVE_THRESHOLD || Math.abs(ny - prev.y) > CLICK_MOVE_THRESHOLD)) {
          dragMoved.current = true
        }
        return { x: nx, y: ny }
      })
    }
  }

  function handleMouseUp() {
    if (resizeRoomId && resizeSize) {
      onRoomResized?.(resizeRoomId, resizeSize.w, resizeSize.h)
      setResizeRoomId(null)
      setResizeSize(null)
      return
    }
    if (dragRoomId && dragPos) {
      if (dragMoved.current) {
        onRoomMoved?.(dragRoomId, dragPos.x, dragPos.y)
      } else {
        // 実際には動いていない = 純粋なクリック。ダブルクリック判定用に記録する
        lastGenuineClick.current = { roomId: dragRoomId, time: Date.now() }
      }
      setDragRoomId(null)
      setDragPos(null)
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      style={{ width: '100%', height: '100%', background: 'var(--panel-bg)', touchAction: 'none' }}
      onClick={(e) => {
        if (!onBackgroundClick) return
        // room/アイコンは自身のonClickでstopPropagationするため、ここに来るのは背景クリックのみ
        const loc = toSvgPoint(e.clientX, e.clientY)
        onBackgroundClick(loc.x, loc.y)
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDragRoomId(null); setDragPos(null); setResizeRoomId(null); setResizeSize(null) }}
    >
      {floor.background_image && (
        <image href={floor.background_image} x={0} y={0} width={floor.width} height={floor.height} />
      )}

      {rooms.map((room) => {
        const label = room.name || (room.type ? ROOM_LABEL[room.type] : '未設定')
        const selected = selectedRoomId === room.id
        const isDragging = dragRoomId === room.id && dragPos
        const isResizing = resizeRoomId === room.id && resizeSize
        const rx = isDragging ? dragPos.x : room.x
        const ry = isDragging ? dragPos.y : room.y
        const rw = isResizing ? resizeSize.w : room.w
        const rh = isResizing ? resizeSize.h : room.h
        return (
          <g
            key={room.id}
            onClick={onRoomClick ? (e) => { e.stopPropagation(); onRoomClick(room) } : undefined}
            onMouseDown={(e) => handleRoomMouseDown(e, room)}
            onContextMenu={(e) => handleRoomContextMenu(e, room)}
            style={{ cursor: onRoomClick ? 'pointer' : editableRooms ? 'move' : 'default' }}
          >
            <rect
              x={rx} y={ry} width={rw} height={rh}
              fill={selected ? 'var(--accent-bg)' : 'var(--room-fill)'}
              stroke={isResizing ? 'var(--accent)' : 'var(--room-border)'}
              strokeWidth={selected || isResizing ? 2.5 : 1.5}
              rx={2}
              fillOpacity={0.85}
            />
            <text
              x={rx + rw / 2} y={ry + rh / 2}
              fontSize={Math.max(6, Math.min(rh * 0.4, (rw * 1.7) / label.length, 15))}
              textAnchor="middle" dominantBaseline="middle"
              fill="var(--text-h)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
          </g>
        )
      })}

      {presence.map((emp) => {
        if (emp.current_x == null || emp.current_y == null) return null
        const isMine = emp.id === myEmployeeId
        const handleContextMenu = onAdminIconContextMenu
          ? (e: React.MouseEvent) => {
              e.preventDefault()
              onAdminIconContextMenu(emp)
            }
          : isMine
            ? (e: React.MouseEvent) => {
                e.preventDefault()
                onMyIconContextMenu?.()
              }
            : undefined
        return (
          <g
            key={emp.id}
            onContextMenu={handleContextMenu}
            style={{ cursor: isMine || onAdminIconContextMenu ? 'pointer' : 'default' }}
          >
            <foreignObject x={emp.current_x - ICON_SIZE / 2} y={emp.current_y - ICON_SIZE / 2} width={ICON_SIZE} height={ICON_SIZE}>
              <div
                title={emp.name}
                style={{
                  width: ICON_SIZE, height: ICON_SIZE, borderRadius: '50%',
                  boxShadow: isMine ? '0 0 0 2px var(--accent)' : '0 0 0 1px var(--border)',
                }}
              >
                <IconAvatar iconType={emp.icon_type} iconValue={emp.icon_value} size={ICON_SIZE} />
              </div>
            </foreignObject>
            <text
              x={emp.current_x} y={emp.current_y + ICON_SIZE / 2 + 9}
              fontSize={8} textAnchor="middle" fill="var(--text-h)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {emp.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
