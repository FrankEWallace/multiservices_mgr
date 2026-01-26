from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Expense(Base):
    """Expense model for tracking costs and expenses."""
    
    __tablename__ = "expenses"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # fixed, variable, operating
    description: Mapped[str] = mapped_column(Text, nullable=True)
    vendor: Mapped[str] = mapped_column(String(255), nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Track who created it
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    service: Mapped["Service"] = relationship(back_populates="expenses")
    created_by_user: Mapped["User"] = relationship(back_populates="expenses")
    
    def __repr__(self) -> str:
        return f"<Expense(id={self.id}, amount={self.amount}, category={self.category})>"
