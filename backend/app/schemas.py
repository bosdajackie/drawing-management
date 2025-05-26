from pydantic import BaseModel

class DimensionBase(BaseModel):
    name: str
    unit: str

class Dimension(DimensionBase):
    id: int

    class Config:
        from_attributes = True 