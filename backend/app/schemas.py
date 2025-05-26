from pydantic import BaseModel
from typing import List, Optional

class DimensionBase(BaseModel):
    name: str
    unit: str

class Dimension(DimensionBase):
    id: int

    class Config:
        from_attributes = True

class PartTypeBase(BaseModel):
    name: str

class PartType(PartTypeBase):
    id: int
    dimensions: List[Dimension] = []

    class Config:
        from_attributes = True

class PartBase(BaseModel):
    part_number: str
    description: Optional[str] = None
    part_type_id: int

class Part(PartBase):
    id: int
    part_type: PartType

    class Config:
        from_attributes = True

class DimensionValue(BaseModel):
    dimension_id: int
    value: str

    class Config:
        from_attributes = True 