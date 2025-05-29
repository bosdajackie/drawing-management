from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict
from . import models, schemas
from .database import engine, get_db
from .ocr import OCRProcessor
import os
import tempfile
from pydantic import BaseModel
import json
from pdf2image import convert_from_path
from PIL import Image
import base64
from dotenv import load_dotenv
from openai import OpenAI

client = OpenAI()

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

class BoundingBox(BaseModel):
    startX: float
    startY: float
    width: float
    height: float
    scale: float
    pageNumber: int

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

@app.post("/api/ocr/process-region")
async def process_pdf_region(
    file: UploadFile = File(...),
    bbox_data: str = Form(...)
):
    try:
        bbox = json.loads(bbox_data)
        
        # Create a temporary file to store the uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            # Convert specific PDF page to image
            dpi = 300  # You can adjust this value for quality vs performance
            images = convert_from_path(temp_path, dpi=dpi, first_page=bbox['pageNumber'], last_page=bbox['pageNumber'])
            if not images:
                raise HTTPException(status_code=500, detail="Could not convert PDF page to image")
            
            image = images[0]
            img_width, img_height = image.size
            
            # Convert PDF points to pixels using DPI scaling
            scale_factor = dpi / 72.0  # Standard PDF point to pixel conversion
            x = max(0, int(bbox['startX'] * scale_factor))
            y = max(0, int(bbox['startY'] * scale_factor))
            width = min(img_width - x, int(bbox['width'] * scale_factor))
            height = min(img_height - y, int(bbox['height'] * scale_factor))
            
            # Validate coordinates
            if x >= img_width or y >= img_height or width <= 0 or height <= 0:
                raise HTTPException(status_code=400, detail="Invalid region coordinates")
            
            # Crop the image to the specified region
            region_image = image.crop((x, y, x + width, y + height))
            
            # Create a temporary file for the PNG
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as png_file:
                region_image.save(png_file.name, format='PNG')
                png_path = png_file.name
            
            # Convert PNG to base64 for response
            with open(png_path, 'rb') as img_file:
                img_data = img_file.read()
                img_base64 = base64.b64encode(img_data).decode()
            
            # Clean up temporary files
            os.unlink(temp_path)
            os.unlink(png_path)

            # Only process with GPT-4 Vision if API key is available
            gpt_response = None
            img_url = f"data:image/png;base64,{img_base64}"
            try:
                gpt_response = client.responses.create(
                    model="gpt-4.1-mini",
                    input=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": "what's in this image?"},
                                {
                                    "type": "input_image",
                                    "image_url": img_url,
                                },
                            ],
                        }
                    ]
                )
            except Exception as e:
                print(f"OpenAI API error: {str(e)}")
                gpt_response = None

            return {
                "success": True,
                "image": {
                    "base64": img_base64,
                    "width": width,
                    "height": height
                },
                "gpt_response": gpt_response
            }
            
        except Exception as e:
            # Clean up temporary files in case of error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise HTTPException(status_code=500, detail=str(e))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid bbox_data format") 