from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Revenue(Base):
    """Revenue model for tracking income from services."""
    
    __tablename__ = "revenues"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(50), default="cash")  # cash, bank, mobile
    reference: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Track who created it
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    service: Mapped["Service"] = relationship(back_populates="revenues")
    created_by_user: Mapped["User"] = relationship(back_populates="revenues")
    
    def __repr__(self) -> str:
        return f"<Revenue(id={self.id}, amount={self.amount}, date={self.date})>"
