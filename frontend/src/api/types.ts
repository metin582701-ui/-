export type Floor = {
  id: string
  name: string
  width: number
  height: number
  background_image: string | null
}

export type RoomType = 'meeting_room' | 'reception' | 'table' | null

export type Room = {
  id: string
  floor_id: string
  type: RoomType
  name: string | null
  x: number
  y: number
  w: number
  h: number
  capacity: number | null
}

export type Reservation = {
  id: string
  room_id: string
  reserver_name: string
  date: string
  start_time: string
  end_time: string
  attendee_count: number
  overview: string | null
  status: string
  created_at: string
}

export type Employee = {
  id: string
  name: string
  icon_type: 'template' | 'custom'
  icon_value: string
  status: 'office' | 'telework' | 'leave'
  status_date: string | null
  current_floor_id: string | null
  current_x: number | null
  current_y: number | null
}

export type Attendance = {
  date: string
  floor_id: string | null
  total_employee_count: number
  denominator: number
  seated_count: number
  attendance_rate_percent: number | null
}
