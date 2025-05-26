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
    part_types = db.query(models.PartType).all()
    return part_types

@app.get("/part-types/{part_type_id}/dimensions", response_model=List[schemas.Dimension])
def get_part_type_dimensions(part_type_id: int, db: Session = Depends(get_db)):
    part_type = db.query(models.PartType).filter(models.PartType.id == part_type_id).first()
    if not part_type:
        raise HTTPException(status_code=404, detail="Part type not found")
    return part_type.dimensions

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