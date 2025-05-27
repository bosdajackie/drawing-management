from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from .database import Base

class PartType(Base):
    __tablename__ = "part_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    parts = relationship("Part", back_populates="part_type")
    dimensions = relationship("Dimension", 
                            secondary="part_type_dimensions",
                            back_populates="part_types")

class Dimension(Base):
    __tablename__ = "dimensions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    part_types = relationship("PartType", 
                            secondary="part_type_dimensions",
                            back_populates="dimensions")

class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), nullable=False, unique=True)
    description = Column(String(500))
    part_type_id = Column(Integer, ForeignKey("part_types.id"), nullable=False)
    part_type = relationship("PartType", back_populates="parts")

class DimensionValue(Base):
    __tablename__ = "dimension_values"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    dimension_id = Column(Integer, ForeignKey("dimensions.id"), nullable=False)
    value = Column(String(50), nullable=False)

# Association table for part_types and dimensions
part_type_dimensions = Table(
    "part_type_dimensions",
    Base.metadata,
    Column("part_type_id", Integer, ForeignKey("part_types.id"), primary_key=True),
    Column("dimension_id", Integer, ForeignKey("dimensions.id"), primary_key=True)
) 