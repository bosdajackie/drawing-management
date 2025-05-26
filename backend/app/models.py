from sqlalchemy import Column, Integer, String
from .database import Base

class Dimension(Base):
    __tablename__ = "dimensions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False) 