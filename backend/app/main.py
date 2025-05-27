from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas
from .database import engine, get_db
from .ocr import OCRProcessor
import os
import tempfile

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR processor
ocr_processor = OCRProcessor()

@app.get("/dimensions/", response_model=List[schemas.Dimension])
def get_dimensions(db: Session = Depends(get_db)):
    dimensions = db.query(models.Dimension).all()
    return dimensions

@app.get("/part-types/", response_model=List[schemas.PartType])
def get_part_types(db: Session = Depends(get_db)):
    # Query part types with proper joins to get associated dimensions
    part_types = (
        db.query(models.PartType)
        .outerjoin(models.part_type_dimensions)
        .outerjoin(models.Dimension)
        .order_by(models.PartType.id)
        .all()
    )
    return part_types

@app.get("/part-types/{part_type_id}/dimensions", response_model=List[schemas.Dimension])
def get_part_type_dimensions(part_type_id: int, db: Session = Depends(get_db)):
    # Use the same join logic as in the SQL query you provided
    dimensions = (
        db.query(models.Dimension)
        .join(models.part_type_dimensions)
        .join(models.PartType)
        .filter(models.PartType.id == part_type_id)
        .all()
    )
    if not dimensions:
        raise HTTPException(status_code=404, detail="No dimensions found for this part type")
    return dimensions

@app.get("/search/", response_model=List[schemas.SearchResult])
def search_parts(
    part_type_id: int = None,
    part_number: str = None,
    db: Session = Depends(get_db)
):
    print(f"\nSearching with part_type_id: {part_type_id}, part_number: {part_number}")
    
    query = db.query(models.Part)
    
    if part_type_id:
        query = query.filter(models.Part.part_type_id == part_type_id)
    
    if part_number:
        query = query.filter(models.Part.part_number.ilike(f"%{part_number}%"))
    
    parts = query.all()
    print(f"Found {len(parts)} parts")
    
    results = []
    for part in parts:
        # Get the dimensions associated with this part's type
        part_type_dimensions = (
            db.query(models.Dimension)
            .join(models.part_type_dimensions)
            .filter(models.part_type_dimensions.c.part_type_id == part.part_type_id)
            .all()
        )
        print(f"Found {len(part_type_dimensions)} dimensions for part type {part.part_type_id}")
        
        # Get dimension values for this part
        dimension_values = {
            dv.dimension_id: dv.value
            for dv in db.query(models.DimensionValue)
            .filter(models.DimensionValue.part_id == part.id)
            .all()
        }
        print(f"Found {len(dimension_values)} dimension values for part {part.part_number}")
        
        # Only include dimensions that are associated with this part's type
        filtered_dimensions = {
            dim.id: dimension_values.get(dim.id, '')
            for dim in part_type_dimensions
        }
        
        results.append({
            "partNumber": part.part_number,
            "partTypeId": part.part_type_id,
            "dimensions": filtered_dimensions,
            "drawingUrl": "/placeholder-drawing.png"  # TODO: Add actual drawing URL
        })
    
    print(f"Returning {len(results)} results")
    return results

@app.post("/api/ocr/process")
async def process_pdf(file: UploadFile = File(...)):
    # Create a temporary file to store the uploaded PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        # Process the PDF using OCR
        results = ocr_processor.process_pdf(temp_path)
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        return {"success": True, "results": results}
    except Exception as e:
        # Clean up the temporary file in case of error
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        return {"success": False, "error": str(e)} 