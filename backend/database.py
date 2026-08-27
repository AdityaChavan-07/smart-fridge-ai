import os
from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./smart_fridge.db",
)

connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ============================================================
# INVENTORY MODEL
# ============================================================

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    item_name = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    # Current quantity available in the fridge.
    #
    # Example:
    # Eggs = 12
    #
    # User consumes 2:
    # Eggs = 10
    quantity = Column(
        Integer,
        default=1,
        nullable=False,
    )

    # Expected number of units consumed per week.
    #
    # Example:
    # Eggs = 7 units/week
    weekly_velocity = Column(
        Float,
        default=0.0,
        nullable=False,
    )

    # Automatically updated whenever the item changes.
    last_updated = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db():
    """
    Create database tables if they do not already exist.
    """
    Base.metadata.create_all(bind=engine)


# ============================================================
# DATABASE SESSION
# ============================================================

def get_db():
    """
    FastAPI database dependency.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()