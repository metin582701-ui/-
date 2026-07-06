from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import datetime

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_employee
from ..ws_manager import manager

router = APIRouter(prefix="/api/presence", tags=["presence"])


@router.get("/floors/{floor_id}", response_model=list[schemas.EmployeeOut])
def list_floor_presence(floor_id: str, db: Session = Depends(get_db)):
    return db.query(models.Employee).filter(models.Employee.current_floor_id == floor_id).all()


@router.put("", response_model=schemas.EmployeeOut)
async def set_presence(
    body: schemas.PresenceUpdate,
    employee: models.Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    if not db.get(models.Floor, body.floor_id):
        raise HTTPException(404, "フロアが見つかりません")
    prev_floor_id = employee.current_floor_id

    employee.current_floor_id = body.floor_id
    employee.current_x = body.x
    employee.current_y = body.y
    employee.position_updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(employee)

    await manager.broadcast("presence_updated", {"employee_id": employee.id, "floor_id": body.floor_id})
    if prev_floor_id and prev_floor_id != body.floor_id:
        await manager.broadcast("presence_updated", {"employee_id": employee.id, "floor_id": prev_floor_id})
    return employee


@router.delete("", response_model=schemas.EmployeeOut)
async def clear_presence(
    employee: models.Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    old_floor_id = employee.current_floor_id
    employee.current_floor_id = None
    employee.current_x = None
    employee.current_y = None
    employee.position_updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(employee)

    if old_floor_id:
        await manager.broadcast("presence_updated", {"employee_id": employee.id, "floor_id": old_floor_id})
    return employee
