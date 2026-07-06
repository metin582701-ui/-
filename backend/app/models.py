import uuid
import datetime
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from .database import Base


def gen_id():
    return uuid.uuid4().hex


class Floor(Base):
    __tablename__ = "floors"

    id = Column(String, primary_key=True)  # 例: "8F" / "9F"
    name = Column(String, nullable=False)
    background_image = Column(String, nullable=True)  # 静止レイアウト画像のURL
    width = Column(Float, nullable=False, default=0)  # 画像の実ピクセルサイズ
    height = Column(Float, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    rooms = relationship("MeetingRoom", back_populates="floor", cascade="all, delete-orphan")


class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"

    id = Column(String, primary_key=True, default=gen_id)
    floor_id = Column(String, ForeignKey("floors.id"), nullable=False)
    type = Column(String, nullable=True)  # meeting_room / reception / table (未タグ時はNULL)
    name = Column(String, nullable=True)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    w = Column(Float, nullable=False)
    h = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=True)

    floor = relationship("Floor", back_populates="rooms")
    reservations = relationship("Reservation", back_populates="room", cascade="all, delete-orphan")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(String, primary_key=True, default=gen_id)
    room_id = Column(String, ForeignKey("meeting_rooms.id"), nullable=False)
    reserver_name = Column(String, nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    start_time = Column(String, nullable=False)  # HH:MM
    end_time = Column(String, nullable=False)  # HH:MM
    attendee_count = Column(Integer, nullable=False)
    overview = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")  # active / cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("MeetingRoom", back_populates="reservations")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    icon_type = Column(String, nullable=False, default="template")  # template / custom
    icon_value = Column(Text, nullable=False, default="😀")  # テンプレートの絵文字 or カスタム画像のdata URL
    status = Column(String, nullable=False, default="office")  # office / telework / leave
    status_date = Column(String, nullable=True)  # YYYY-MM-DD (直近の状態変更日)

    # 現在の在席位置(NULL = 不在・アイコン未設置)
    current_floor_id = Column(String, ForeignKey("floors.id"), nullable=True)
    current_x = Column(Float, nullable=True)
    current_y = Column(Float, nullable=True)
    position_updated_at = Column(DateTime, nullable=True)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    password_hash = Column(String, nullable=False)
    total_employee_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
