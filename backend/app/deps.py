from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .security import verify_session_token, verify_employee_session_token
from . import models

ADMIN_COOKIE_NAME = "admin_session"
EMPLOYEE_COOKIE_NAME = "employee_session"


def require_admin(admin_session: str | None = Cookie(default=None, alias=ADMIN_COOKIE_NAME)):
    if not admin_session or not verify_session_token(admin_session):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="管理者ログインが必要です")
    return True


def get_current_employee(
    employee_session: str | None = Cookie(default=None, alias=EMPLOYEE_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> models.Employee:
    employee_id = employee_session and verify_employee_session_token(employee_session)
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ログインが必要です")
    employee = db.get(models.Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ログインが必要です")
    return employee
