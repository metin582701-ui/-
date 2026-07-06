import os

import bcrypt
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

# 本番環境では必ずSECRET_KEY環境変数を設定すること(未設定時は開発用の固定値にフォールバック)
SECRET_KEY = os.environ.get("SECRET_KEY", "office-layout-admin-session-secret-change-me")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
ADMIN_SESSION_MAX_AGE = 60 * 60 * 8  # 8時間
EMPLOYEE_SESSION_MAX_AGE = 60 * 60 * 24 * 30  # サーバー側の保険上限(30日)。実際はブラウザを閉じるとCookie自体が消える。

_admin_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="admin-session")
_employee_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="employee-session")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_session_token() -> str:
    return _admin_serializer.dumps({"admin": True})


def verify_session_token(token: str) -> bool:
    try:
        data = _admin_serializer.loads(token, max_age=ADMIN_SESSION_MAX_AGE)
        return bool(data.get("admin"))
    except (BadSignature, SignatureExpired):
        return False


def create_employee_session_token(employee_id: str) -> str:
    return _employee_serializer.dumps({"employee_id": employee_id})


def verify_employee_session_token(token: str) -> str | None:
    try:
        data = _employee_serializer.loads(token, max_age=EMPLOYEE_SESSION_MAX_AGE)
        return data.get("employee_id")
    except (BadSignature, SignatureExpired):
        return None
