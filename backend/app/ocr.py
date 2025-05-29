import pytesseract
from pdf2image import convert_from_path
import numpy as np
from PIL import Image
import re
import os
from typing import List, Dict, Optional, Any, TypedDict
import pandas as pd

class Coordinates(TypedDict):
    x: int
    y: int
    width: int
    height: int

class DimensionData(TypedDict):
    value: str
    coordinates: Coordinates
    confidence: Optional[float]

class OCRProcessor:
    def __init__(self, tesseract_cmd: Optional[str] = None):
        """
        Initialize OCR processor with optional tesseract command path
        Args:
            tesseract_cmd: Path to tesseract executable (e.g. 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe' on Windows)
        """
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            
        # Configure tesseract parameters for better text recognition
        self.custom_config = r'--oem 3 --psm 6'
        
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
    
    def _extract_dimensions_with_coords(self, image: Image.Image) -> List[DimensionData]:
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
        
        dimensions: List[DimensionData] = []
        
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
    
    def process_pdf(self, pdf_path: str, dpi: int = 200) -> Dict[int, List[DimensionData]]:
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
        
        results: Dict[int, List[DimensionData]] = {}
        for i, image in enumerate(images, start=1):
            # Preprocess the image
            processed_image = self._preprocess_image(image)
            
            # Extract dimensions with coordinates
            dimensions = self._extract_dimensions_with_coords(processed_image)
            
            # Store results
            results[i] = dimensions
            
        return results
    
    def process_image(self, image_path: str) -> List[DimensionData]:
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
    
    def process_pdf_region(self, pdf_path: str, page_number: int, region: Dict[str, float], dpi: int = 200) -> Dict[str, Any]:
        """
        Process a specific region of a PDF page and extract text/dimensions
        Args:
            pdf_path: Path to the PDF file
            page_number: The page number to process (1-based)
            region: Dictionary with x, y, width, height in PDF points
            dpi: DPI for PDF to image conversion
        Returns:
            Dictionary containing OCR results for the region
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
            
        # Convert specific PDF page to image
        images = convert_from_path(pdf_path, dpi=dpi, first_page=page_number, last_page=page_number)
        if not images:
            raise ValueError(f"Could not convert page {page_number} of PDF")
            
        image = images[0]
        
        # Get original image dimensions
        img_width, img_height = image.size
        print("\nBackend PDF Processing Debug:")
        print(f"1. Original PDF converted to image at {dpi} DPI")
        print(f"2. Image dimensions: {img_width}x{img_height} pixels")
        print(f"3. Points to pixels scale factor (dpi/72): {dpi/72.0}")
        print(f"4. Received region coordinates (PDF points):", region)
        
        # Convert PDF points to pixels using DPI scaling
        scale_factor = dpi / 72.0  # Standard PDF point to pixel conversion
        x = max(0, int(region['x'] * scale_factor))
        y = max(0, int(region['y'] * scale_factor))
        width = min(img_width - x, int(region['width'] * scale_factor))
        height = min(img_height - y, int(region['height'] * scale_factor))
        
        print(f"5. Converted to pixel coordinates: x={x}, y={y}, width={width}, height={height}")
        
        # Validate coordinates
        if x >= img_width or y >= img_height or width <= 0 or height <= 0:
            print("Warning: Invalid coordinates after conversion!")
            print(f"Image bounds: width={img_width}, height={img_height}")
            print(f"Attempted coordinates: x={x}, y={y}, width={width}, height={height}")
            return {
                'text': '',
                'detailed_text': [],
                'dimensions': [],
                'region': region,
                'debug_info': {
                    'image_size': {'width': img_width, 'height': img_height},
                    'calculated_coords': {'x': x, 'y': y, 'width': width, 'height': height},
                    'scale_factor': scale_factor,
                    'dpi': dpi
                }
            }
        
        # Crop the image to the specified region
        region_image = image.crop((x, y, x + width, y + height))
        
        # Preprocess the cropped region
        processed_image = self._preprocess_image(region_image)
        
        # Get detailed OCR data including coordinates
        ocr_data = pytesseract.image_to_data(processed_image, config=self.custom_config, output_type=pytesseract.Output.DATAFRAME)
        
        # Filter out empty text
        valid_rows = ocr_data[ocr_data['text'].notna()]
        
        # Collect all text with confidence scores
        detected_text = []
        for _, row in valid_rows.iterrows():
            text = str(row['text']).strip()
            if text:  # Only include non-empty text
                detected_text.append({
                    'text': text,
                    'confidence': float(row['conf']) if row['conf'] != -1 else 0,
                    'coordinates': {
                        'x': int(row['left']),
                        'y': int(row['top']),
                        'width': int(row['width']),
                        'height': int(row['height'])
                    }
                })
        
        # Also get the raw text output
        raw_text = pytesseract.image_to_string(processed_image, config=self.custom_config)
        
        # Look for potential dimensions in the text
        dimension_pattern = r'\b(?:Ø|⌀)?(\d+(?:[.,]\d+)?(?:\s*(?:mm|cm|m))?)\b'
        potential_dimensions: List[DimensionData] = []
        
        for text_item in detected_text:
            matches = re.finditer(dimension_pattern, text_item['text'], re.IGNORECASE)
            for match in matches:
                potential_dimensions.append({
                    'value': match.group(0),
                    'coordinates': text_item['coordinates'],
                    'confidence': text_item['confidence']
                })
        
        return {
            'text': raw_text.strip(),
            'detailed_text': detected_text,
            'dimensions': potential_dimensions,
            'region': {
                'x': x,
                'y': y,
                'width': width,
                'height': height
            },
            'debug_info': {
                'image_size': {'width': img_width, 'height': img_height},
                'calculated_coords': {'x': x, 'y': y, 'width': width, 'height': height},
                'scale_factor': scale_factor,
                'dpi': dpi
            }
        } 