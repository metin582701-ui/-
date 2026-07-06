import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# DATABASE_URLが未設定の場合はローカルのSQLiteファイルを使う。
# 永続ディスクをマウントしたパス(例: /data/data.db)をDB_PATHで指定することも可能。
DB_PATH = os.environ.get("DB_PATH") or os.path.join(os.path.dirname(os.path.dirname(__file__)), "data.db")
DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{DB_PATH}"

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
