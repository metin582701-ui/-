from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/floors", tags=["floors"])


@router.get("", response_model=list[schemas.FloorOut])
def list_floors(db: Session = Depends(get_db)):
    return db.query(models.Floor).order_by(models.Floor.id).all()


@router.get("/{floor_id}", response_model=schemas.FloorOut)
def get_floor(floor_id: str, db: Session = Depends(get_db)):
    f = db.get(models.Floor, floor_id)
    if not f:
        raise HTTPException(404, "フロアが見つかりません")
    return f


@router.get("/{floor_id}/rooms", response_model=list[schemas.RoomOut])
def list_rooms(floor_id: str, db: Session = Depends(get_db)):
    return db.query(models.MeetingRoom).filter(models.MeetingRoom.floor_id == floor_id).all()


@router.get("/{floor_id}/occupancy")
def floor_occupancy(floor_id: str, db: Session = Depends(get_db)):
    occupied = db.query(models.Employee).filter(models.Employee.current_floor_id == floor_id).count()
    return {"floor_id": floor_id, "occupied": occupied}
