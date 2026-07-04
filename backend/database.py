import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://walluser:wallpassword@127.0.0.1:3307/thewall")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ConfessionModel(Base):
    __tablename__ = "confessions"
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    confession = Column(Text, nullable=False)
    cringe_score = Column(Float, nullable=False)
    survival_probability = Column(Float, nullable=False)
    roast = Column(Text, nullable=False)
    verdict = Column(String(255), nullable=False)
    era = Column(String(255), nullable=True)
    target_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ReplyModel(Base):
    __tablename__ = "replies"
    id = Column(String(36), primary_key=True, index=True)
    confession_id = Column(String(36), ForeignKey("confessions.id", ondelete="CASCADE"), index=True)
    user_id = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ActiveSessionModel(Base):
    __tablename__ = "active_sessions"
    user_id = Column(String(255), primary_key=True, index=True)
    session_token = Column(String(512), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)
