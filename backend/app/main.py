import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import Base, engine, SessionLocal
from . import models
from .security import hash_password
from .routers import floors, rooms, employees, admin, auth, presence
from .ws_manager import manager

Base.metadata.create_all(bind=engine)

# 初回起動時: 設定レコード(パスワード・社員総数)を作成
with SessionLocal() as db:
    if db.get(models.Settings, 1) is None:
        initial_password = os.environ.get("INITIAL_ADMIN_PASSWORD", "admin1234")
        db.add(models.Settings(id=1, password_hash=hash_password(initial_password), total_employee_count=0))
        db.commit()

app = FastAPI(title="オフィスレイアウト管理システム")

_extra_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *_extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(floors.router)
app.include_router(rooms.router)
app.include_router(employees.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(presence.router)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


@app.get("/api/health")
def health():
    return {"ok": True}


# --- 本番用: フロントエンドのビルド成果物(frontend/dist)を同じサービスで配信する ---
_frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend_dist")
if os.path.isdir(_frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = os.path.join(_frontend_dist, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_frontend_dist, "index.html"))
