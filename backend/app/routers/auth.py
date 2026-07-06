from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_employee, EMPLOYEE_COOKIE_NAME
from ..security import hash_password, verify_password, create_employee_session_token, COOKIE_SECURE

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.EmployeeOut)
def register(body: schemas.EmployeeRegister, response: Response, db: Session = Depends(get_db)):
    name = body.name.strip()
    if not name or not body.password:
        raise HTTPException(400, "名前とパスワードを入力してください")
    if db.query(models.Employee).filter(models.Employee.name == name).one_or_none():
        raise HTTPException(409, "その名前は既に登録されています")

    employee = models.Employee(
        name=name,
        password_hash=hash_password(body.password),
        icon_type=body.icon_type,
        icon_value=body.icon_value,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    token = create_employee_session_token(employee.id)
    response.set_cookie(EMPLOYEE_COOKIE_NAME, token, httponly=True, samesite="lax", secure=COOKIE_SECURE)
    return employee


@router.post("/login", response_model=schemas.EmployeeOut)
def login(body: schemas.EmployeeLogin, response: Response, db: Session = Depends(get_db)):
    employee = db.query(models.Employee).filter(models.Employee.name == body.name.strip()).one_or_none()
    if not employee or not verify_password(body.password, employee.password_hash):
        raise HTTPException(401, "名前またはパスワードが違います")

    token = create_employee_session_token(employee.id)
    response.set_cookie(EMPLOYEE_COOKIE_NAME, token, httponly=True, samesite="lax", secure=COOKIE_SECURE)
    return employee


@router.post("/reset-password")
def reset_password(body: schemas.EmployeePasswordReset, db: Session = Depends(get_db)):
    """管理者パスワードを認証コードとして使い、自分でパスワードを再設定する(パスワードを忘れた場合用)。"""
    settings = db.get(models.Settings, 1)
    if not settings or not verify_password(body.admin_password, settings.password_hash):
        raise HTTPException(401, "管理者パスワードが違います")

    employee = db.query(models.Employee).filter(models.Employee.name == body.name.strip()).one_or_none()
    if not employee:
        raise HTTPException(404, "その名前の社員が見つかりません")

    employee.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(EMPLOYEE_COOKIE_NAME)
    return {"ok": True}


@router.get("/me", response_model=schemas.EmployeeOut)
def me(employee: models.Employee = Depends(get_current_employee)):
    return employee


@router.put("/me", response_model=schemas.EmployeeOut)
def update_me(
    body: schemas.EmployeeSelfUpdate,
    employee: models.Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    if body.name and body.name.strip() != employee.name:
        new_name = body.name.strip()
        if db.query(models.Employee).filter(models.Employee.name == new_name).one_or_none():
            raise HTTPException(409, "その名前は既に使用されています")
        employee.name = new_name
    if body.password:
        employee.password_hash = hash_password(body.password)
    if body.icon_type:
        employee.icon_type = body.icon_type
    if body.icon_value:
        employee.icon_value = body.icon_value
    db.commit()
    db.refresh(employee)
    return employee
