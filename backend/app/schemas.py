import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class FloorOut(BaseModel):
    id: str
    name: str
    width: float
    height: float
    background_image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoomOut(BaseModel):
    id: str
    floor_id: str
    type: Optional[str] = None
    name: Optional[str] = None
    x: float
    y: float
    w: float
    h: float
    capacity: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class RoomCreate(BaseModel):
    x: float
    y: float
    w: float
    h: float
    type: Optional[str] = None
    name: Optional[str] = None
    capacity: Optional[int] = None


class RoomUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    capacity: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    w: Optional[float] = None
    h: Optional[float] = None


class ReservationOut(BaseModel):
    id: str
    room_id: str
    reserver_name: str
    date: str
    start_time: str
    end_time: str
    attendee_count: int
    overview: Optional[str] = None
    status: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class ReservationCreate(BaseModel):
    reserver_name: str
    date: str
    start_time: str
    end_time: str
    attendee_count: int
    overview: Optional[str] = None


class EmployeeOut(BaseModel):
    id: str
    name: str
    icon_type: str
    icon_value: str
    status: str
    status_date: Optional[str] = None
    current_floor_id: Optional[str] = None
    current_x: Optional[float] = None
    current_y: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeStatusUpdate(BaseModel):
    status: str  # office / telework / leave
    status_date: str


class EmployeeRegister(BaseModel):
    name: str
    password: str
    icon_type: str = "template"
    icon_value: str = "😀"


class EmployeeLogin(BaseModel):
    name: str
    password: str


class EmployeePasswordReset(BaseModel):
    name: str
    new_password: str
    admin_password: str


class EmployeeSelfUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    icon_type: Optional[str] = None
    icon_value: Optional[str] = None


class PresenceUpdate(BaseModel):
    floor_id: str
    x: float
    y: float


class AdminLogin(BaseModel):
    password: str


class AdminSettingsUpdate(BaseModel):
    password: Optional[str] = None
    total_employee_count: Optional[int] = None
