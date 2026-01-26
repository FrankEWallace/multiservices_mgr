from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Service(Base):
    """Service model representing different business units."""
    
    __tablename__ = "services"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="building")
    color: Mapped[str] = mapped_column(String(50), default="blue")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Financial targets
    daily_target: Mapped[float] = mapped_column(Float, default=0.0)
    monthly_target: Mapped[float] = mapped_column(Float, default=0.0)
    yearly_target: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    revenues: Mapped[list["Revenue"]] = relationship(back_populates="service")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="service")
    madenis: Mapped[list["Madeni"]] = relationship(back_populates="service")
    goals: Mapped[list["Goal"]] = relationship(back_populates="service")
    
    def __repr__(self) -> str:
        return f"<Service(id={self.id}, name={self.name})>"
