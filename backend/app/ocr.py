import pytesseract
from pdf2image import convert_from_path
import numpy as np
from PIL import Image
import re
import os
from typing import List, Dict, Optional, Any
import pandas as pd

class OCRProcessor:
    def __init__(self, tesseract_cmd: Optional[str] = None):
        """
        Initialize OCR processor with optional tesseract command path
        Args:
            tesseract_cmd: Path to tesseract executable (e.g. 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe' on Windows)
        """
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            
        # Configure tesseract parameters for better number/dimension recognition
        self.custom_config = r'--oem 3 --psm 11'
        
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess the image for better OCR results
        Args:
            image: PIL Image object
        Returns:
            Preprocessed PIL Image
        """
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale if image is RGB
        if len(img_array.shape) == 3:
            from PIL import ImageOps
            image = ImageOps.grayscale(image)
            
        # Increase contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        return image
    
    def _extract_dimensions_with_coords(self, image: Image.Image) -> List[Dict[str, Any]]:
        """
        Extract potential dimension values from OCR text along with their coordinates
        Args:
            image: PIL Image object
        Returns:
            List of dictionaries containing dimension values and their coordinates
        """
        # Get detailed OCR data including coordinates
        ocr_data = pytesseract.image_to_data(image, config=self.custom_config, output_type=pytesseract.Output.DATAFRAME)
        
        # Pattern for dimension formats
        dimension_pattern = r'^(?:Ø|⌀)?(\d+(?:[.,]\d+)?(?:\s*(?:mm|cm|m))?)$'
        
        dimensions = []
        
        # Filter out empty text and non-dimension text
        valid_rows = ocr_data[ocr_data['text'].notna()]
        
        for _, row in valid_rows.iterrows():
            text = str(row['text']).strip()
            if re.match(dimension_pattern, text, re.IGNORECASE):
                dimensions.append({
                    'value': text,
                    'coordinates': {
                        'x': int(row['left']),
                        'y': int(row['top']),
                        'width': int(row['width']),
                        'height': int(row['height'])
                    },
                    'confidence': float(row['conf']) if row['conf'] != -1 else None
                })
                
        return dimensions
    
    def process_pdf(self, pdf_path: str, dpi: int = 200) -> Dict[int, List[Dict[str, Any]]]:
        """
        Process a PDF file and extract dimensions with coordinates from each page
        Args:
            pdf_path: Path to the PDF file
            dpi: DPI for PDF to image conversion (higher = better quality but slower)
        Returns:
            Dictionary mapping page numbers to lists of dimension data
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
            
        # Convert PDF pages to images
        images = convert_from_path(pdf_path, dpi=dpi)
        
        results = {}
        for i, image in enumerate(images, start=1):
            # Preprocess the image
            processed_image = self._preprocess_image(image)
            
            # Extract dimensions with coordinates
            dimensions = self._extract_dimensions_with_coords(processed_image)
            
            # Store results
            results[i] = dimensions
            
        return results
    
    def process_image(self, image_path: str) -> List[Dict[str, Any]]:
        """
        Process a single image file and extract dimensions with coordinates
        Args:
            image_path: Path to the image file
        Returns:
            List of dictionaries containing dimension values and their coordinates
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
            
        # Load and preprocess image
        image = Image.open(image_path)
        processed_image = self._preprocess_image(image)
        
        # Extract dimensions with coordinates
        return self._extract_dimensions_with_coords(processed_image) 