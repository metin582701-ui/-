import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_employee

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=list[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).order_by(models.Employee.name).all()


@router.get("/attendance")
def attendance_rate(floor_id: str | None = None, db: Session = Depends(get_db)):
    today = datetime.date.today().isoformat()
    settings = db.get(models.Settings, 1)
    total_employee_count = settings.total_employee_count if settings else 0

    # 対象人数(分母)は全社在籍人数で固定。その日オフィスに着席している人数の割合を見る。
    denom = total_employee_count

    seated_q = db.query(models.Employee).filter(models.Employee.current_floor_id.isnot(None))
    if floor_id:
        seated_q = seated_q.filter(models.Employee.current_floor_id == floor_id)
    seated_count = seated_q.count()

    rate = round(seated_count / denom * 100, 1) if denom > 0 else None
    return {
        "date": today,
        "floor_id": floor_id,
        "total_employee_count": total_employee_count,
        "denominator": denom,
        "seated_count": seated_count,
        "attendance_rate_percent": rate,
    }
