import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..ws_manager import manager

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def _to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _has_conflict(db: Session, room_id: str, date: str, start_time: str, end_time: str, exclude_id: str = None) -> bool:
    s1, e1 = _to_minutes(start_time), _to_minutes(end_time)
    q = db.query(models.Reservation).filter(
        models.Reservation.room_id == room_id,
        models.Reservation.date == date,
        models.Reservation.status == "active",
    )
    if exclude_id:
        q = q.filter(models.Reservation.id != exclude_id)
    for r in q.all():
        s2, e2 = _to_minutes(r.start_time), _to_minutes(r.end_time)
        if s1 < e2 and s2 < e1:
            return True
    return False


@router.get("/{room_id}/reservations", response_model=list[schemas.ReservationOut])
def list_reservations(room_id: str, date: str = Query(...), db: Session = Depends(get_db)):
    return (
        db.query(models.Reservation)
        .filter(models.Reservation.room_id == room_id, models.Reservation.date == date,
                models.Reservation.status == "active")
        .order_by(models.Reservation.start_time)
        .all()
    )


@router.get("/{room_id}/reservations/history", response_model=list[schemas.ReservationOut])
def reservation_history(
    room_id: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    if date_to is None:
        date_to = datetime.date.today().isoformat()
    if date_from is None:
        date_from = (datetime.date.today() - datetime.timedelta(days=14)).isoformat()
    return (
        db.query(models.Reservation)
        .filter(
            models.Reservation.room_id == room_id,
            models.Reservation.date >= date_from,
            models.Reservation.date <= date_to,
        )
        .order_by(models.Reservation.date.desc(), models.Reservation.start_time.desc())
        .limit(limit)
        .all()
    )


@router.post("/{room_id}/reservations", response_model=schemas.ReservationOut)
async def create_reservation(room_id: str, body: schemas.ReservationCreate, response: Response, db: Session = Depends(get_db)):
    room = db.get(models.MeetingRoom, room_id)
    if not room:
        raise HTTPException(404, "部屋が見つかりません")
    if body.end_time <= body.start_time:
        raise HTTPException(400, "終了時刻は開始時刻より後にしてください")
    if _has_conflict(db, room_id, body.date, body.start_time, body.end_time):
        raise HTTPException(409, "その時間帯は既に予約が入っています")

    reservation = models.Reservation(
        room_id=room_id,
        reserver_name=body.reserver_name.strip(),
        date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        attendee_count=body.attendee_count,
        overview=body.overview,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    # 定員超過は警告のみ(予約自体はブロックしない)。フロント側でヘッダを見て警告表示する。
    if room.capacity and body.attendee_count > room.capacity:
        response.headers["X-Over-Capacity"] = "true"
    await manager.broadcast("reservation_created", {"room_id": room_id, "date": body.date})
    return reservation


@router.delete("/reservations/{reservation_id}")
async def cancel_reservation(reservation_id: str, requester_name: str = Query(...), db: Session = Depends(get_db)):
    r = db.get(models.Reservation, reservation_id)
    if not r:
        raise HTTPException(404, "予約が見つかりません")
    if r.reserver_name != requester_name.strip():
        raise HTTPException(403, "予約者本人のみ取消できます")
    r.status = "cancelled"
    db.commit()
    await manager.broadcast("reservation_cancelled", {"room_id": r.room_id, "date": r.date})
    return {"ok": True}
