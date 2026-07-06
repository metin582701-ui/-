import base64
import io
import mimetypes

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.orm import Session
from PIL import Image

from .. import models, schemas
from ..database import get_db
from ..deps import require_admin, ADMIN_COOKIE_NAME
from ..security import verify_password, hash_password, create_session_token, COOKIE_SECURE

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
def login(body: schemas.AdminLogin, response: Response, db: Session = Depends(get_db)):
    settings = db.get(models.Settings, 1)
    if not settings or not verify_password(body.password, settings.password_hash):
        raise HTTPException(401, "パスワードが違います")
    token = create_session_token()
    response.set_cookie(ADMIN_COOKIE_NAME, token, httponly=True, samesite="lax", secure=COOKIE_SECURE, max_age=60 * 60 * 8)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(ADMIN_COOKIE_NAME)
    return {"ok": True}


@router.get("/check")
def check(_: bool = Depends(require_admin)):
    return {"ok": True}


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    settings = db.get(models.Settings, 1)
    return {"total_employee_count": settings.total_employee_count}


@router.put("/settings")
def update_settings(body: schemas.AdminSettingsUpdate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    settings = db.get(models.Settings, 1)
    if body.password:
        settings.password_hash = hash_password(body.password)
    if body.total_employee_count is not None:
        settings.total_employee_count = body.total_employee_count
    db.commit()
    return {"ok": True}


@router.post("/floors/{floor_id}/background", response_model=schemas.FloorOut)
async def upload_background(
    floor_id: str,
    floor_name: str = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    content = await file.read()
    with Image.open(io.BytesIO(content)) as img:
        width, height = img.size

    mime = mimetypes.guess_type(file.filename or "")[0] or "image/png"
    data_url = f"data:{mime};base64,{base64.b64encode(content).decode('ascii')}"

    floor = db.get(models.Floor, floor_id)
    if floor is None:
        floor = models.Floor(id=floor_id, name=floor_name or floor_id)
        db.add(floor)
    if floor_name:
        floor.name = floor_name
    floor.background_image = data_url
    floor.width = width
    floor.height = height
    db.commit()
    db.refresh(floor)
    return floor


# --- 会議室・応接室・机の手動タグ付け編集 ---

@router.post("/floors/{floor_id}/rooms", response_model=schemas.RoomOut)
def add_room(floor_id: str, body: schemas.RoomCreate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    if not db.get(models.Floor, floor_id):
        raise HTTPException(404, "フロアが見つかりません")
    room = models.MeetingRoom(
        floor_id=floor_id, x=body.x, y=body.y, w=body.w, h=body.h,
        type=body.type, name=body.name, capacity=body.capacity,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.put("/rooms/{room_id}", response_model=schemas.RoomOut)
def update_room(room_id: str, body: schemas.RoomUpdate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    room = db.get(models.MeetingRoom, room_id)
    if not room:
        raise HTTPException(404, "部屋が見つかりません")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/rooms/{room_id}")
def delete_room(room_id: str, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    room = db.get(models.MeetingRoom, room_id)
    if not room:
        raise HTTPException(404, "部屋が見つかりません")
    db.delete(room)
    db.commit()
    return {"ok": True}


# --- 従業員アカウント管理(退職者の削除・パスワード忘れ対応) ---

@router.get("/employees", response_model=list[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    return db.query(models.Employee).order_by(models.Employee.name).all()


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    employee = db.get(models.Employee, employee_id)
    if not employee:
        raise HTTPException(404, "社員が見つかりません")
    db.delete(employee)
    db.commit()
    return {"ok": True}


@router.put("/employees/{employee_id}/reset-password")
def reset_employee_password(
    employee_id: str, new_password: str, db: Session = Depends(get_db), _: bool = Depends(require_admin)
):
    employee = db.get(models.Employee, employee_id)
    if not employee:
        raise HTTPException(404, "社員が見つかりません")
    employee.password_hash = hash_password(new_password)
    db.commit()
    return {"ok": True}
