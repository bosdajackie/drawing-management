import React, { useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface OCRTextItem {
  text: string;
  confidence: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface OCRResults {
  text: string;
  detailed_text: OCRTextItem[];
  dimensions: {
    value: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }[];
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  debug_info?: {
    image_size: {
      width: number;
      height: number;
    };
    calculated_coords: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    scale_factor: number;
  };
  image?: {
    base64: string;
    width: number;
    height: number;
  };
}

interface Rectangle {
  startX: number;
  startY: number;
  width: number;
  height: number;
  scale: number;
  pageNumber?: number;
  processed?: boolean;
  image?: {
    base64: string;
    width: number;
    height: number;
  };
  gpt_response?: any;
  parsed_response?: {
    measurement_type: string;
    value: number;
    unit: string;
    tolerance_plus?: number;
    tolerance_minus?: number;
    location_note?: string;
    notes?: string;
  };
  originalScale: number;
}

interface Dimension {
  id: number;
  name: string;
  value: number;
}

interface PartType {
  id: number;
  name: string;
  dimensions: Dimension[];
}

const DrawingLabelingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [selectedPartType, setSelectedPartType] = useState<number | null>(null);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate scale when PDF file changes
  const [originalPdfDimensions, setOriginalPdfDimensions] = useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    if (pdfFiles[currentFileIndex]) {
      const loadingTask = pdfjs.getDocument(URL.createObjectURL(pdfFiles[currentFileIndex]));
      loadingTask.promise.then((doc: PDFDocumentProxy) => {
        doc.getPage(1).then((page: PDFPageProxy) => {
          const viewport = page.getViewport({ scale: 1 });
          const containerWidth = canvasRef.current?.parentElement?.parentElement?.parentElement?.clientWidth || window.innerWidth * 0.8;
          
          // Store original PDF dimensions
          setOriginalPdfDimensions({
            width: viewport.width,
            height: viewport.height
          });

          console.log('PDF Dimensions:', {
            originalWidth: viewport.width,
            originalHeight: viewport.height,
            containerWidth,
            calculatedScale: containerWidth / viewport.width
          });
          
          setPdfScale(containerWidth / viewport.width);
        });
      });
    }
  }, [currentFileIndex, pdfFiles]);

  // Add keyboard event listener for undo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setRectangles(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    const fileCount = location.state?.fileCount || 0;
    const fileNames = location.state?.fileNames || [];

    if (fileCount === 0) {
      navigate('/drawings/add');
      return;
    }

    const loadedFiles: File[] = [];
    for (let i = 0; i < fileCount; i++) {
      const pdfData = sessionStorage.getItem(`currentPDF_${i}`);
      if (pdfData) {
        const byteString = atob(pdfData.split(',')[1]);
        const mimeString = pdfData.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) {
          ia[j] = byteString.charCodeAt(j);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], fileNames[i] || `drawing_${i + 1}.pdf`, { type: mimeString });
        loadedFiles.push(file);
      }
    }

    setPdfFiles(loadedFiles);
  }, [location.state, navigate]);

  // Fetch part types
  React.useEffect(() => {
    const fetchPartTypes = async () => {
      try {
        const response = await fetch('http://localhost:8000/part-types/');
        if (!response.ok) {
          throw new Error('Failed to fetch part types');
        }
        const data = await response.json();
        setPartTypes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartTypes();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = parseInt(e.target.value);
    setCurrentFileIndex(newIndex);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get PDF dimensions with fallback
    const pdfWidth = originalPdfDimensions?.width ?? 1;
    const pdfHeight = originalPdfDimensions?.height ?? 1;

    setIsDrawing(true);
    setCurrentRect({
      startX: x / (pdfScale * pdfWidth),  // Convert to normalized coordinates (0-1)
      startY: y / (pdfScale * pdfHeight),
      width: 0,
      height: 0,
      scale: pdfScale,
      originalScale: pdfScale
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isDrawing || !currentRect || !canvasRef.current || !originalPdfDimensions) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentRect(prev => {
      if (!prev) return null;
      return {
        ...prev,
        width: (x / (pdfScale * originalPdfDimensions.width)) - prev.startX,
        height: (y / (pdfScale * originalPdfDimensions.height)) - prev.startY
      };
    });
  };

  const processRectangleOCR = async (rectangle: Rectangle) => {
    if (!pdfFiles[currentFileIndex] || !originalPdfDimensions) return;

    setIsProcessing(true);
    setError(null);

    // Convert normalized coordinates to PDF points
    const pdfCoords = {
      startX: rectangle.startX * originalPdfDimensions.width,
      startY: rectangle.startY * originalPdfDimensions.height,
      width: rectangle.width * originalPdfDimensions.width,
      height: rectangle.height * originalPdfDimensions.height,
      pageNumber
    };

    // Normalize coordinates to handle rectangles drawn in any direction
    const normalizedRect = {
      startX: pdfCoords.width < 0 ? pdfCoords.startX + pdfCoords.width : pdfCoords.startX,
      startY: pdfCoords.height < 0 ? pdfCoords.startY + pdfCoords.height : pdfCoords.startY,
      width: Math.abs(pdfCoords.width),
      height: Math.abs(pdfCoords.height)
    };

    const unscaledCoords = {
      startX: Math.max(0, normalizedRect.startX),
      startY: Math.max(0, normalizedRect.startY),
      width: Math.min(
        originalPdfDimensions.width - normalizedRect.startX,
        normalizedRect.width
      ),
      height: Math.min(
        originalPdfDimensions.height - normalizedRect.startY,
        normalizedRect.height
      ),
      pageNumber
    };

    console.log('Sending region extraction request with coordinates:', unscaledCoords);

    try {
      const formData = new FormData();
      formData.append('file', pdfFiles[currentFileIndex]);
      formData.append('bbox_data', JSON.stringify(unscaledCoords));
      
      const response = await fetch('http://localhost:8000/api/ocr/process-region', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process region');
      }

      const data = await response.json();
      console.log('Received response:', data);
      
      setRectangles(prev => 
        prev.map(rect => 
          rect === rectangle 
            ? {
                ...rect,
                image: data.image,
                gpt_response: data.gpt_response,
                parsed_response: data.parsed_response,
                processed: true
              }
            : rect
        )
      );
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setRectangles(prev => 
        prev.map(rect => 
          rect === rectangle 
            ? {
                ...rect,
                processed: true
              }
            : rect
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const stopDrawing = () => {
    if (!isDrawingMode || !currentRect) return;

    setIsDrawing(false);
    const newRect = { ...currentRect, pageNumber: pageNumber };
    setRectangles(prev => [...prev, newRect]);
    setCurrentRect(null);

    // Process OCR for the new rectangle
    processRectangleOCR(newRect);
  };

  const drawRectangles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalPdfDimensions) return;
    
    // Type guard to ensure we have width and height
    if (typeof originalPdfDimensions.width === 'undefined' || 
        typeof originalPdfDimensions.height === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: pdfWidth, height: pdfHeight } = originalPdfDimensions;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    [...rectangles, currentRect].filter(Boolean).forEach(rect => {
      if (!rect) return;
      
      // Convert normalized coordinates back to screen space
      const scaledX = rect.startX * pdfWidth * pdfScale;
      const scaledY = rect.startY * pdfHeight * pdfScale;
      const scaledWidth = rect.width * pdfWidth * pdfScale;
      const scaledHeight = rect.height * pdfHeight * pdfScale;
      
      // Draw the rectangle
      ctx.strokeStyle = rect.processed ? '#00ff00' : '#ff0000'; // Green if processed, red if not
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Add coordinate labels for debugging
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(
        `(${(rect.startX * pdfWidth).toFixed(1)},${(rect.startY * pdfHeight).toFixed(1)})`,
        scaledX,
        scaledY - 5
      );
    });
  }, [rectangles, currentRect, pdfScale, originalPdfDimensions]);

  // Update useEffect to include drawRectangles in dependencies
  React.useEffect(() => {
    drawRectangles();
  }, [drawRectangles]); // Now this is safe because drawRectangles is memoized

  if (pdfFiles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-6xl">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-between mb-4">
          <h1 className="text-3xl font-bold">Label Dimensions</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`px-4 py-2 rounded ${isDrawingMode
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
                }`}
              title={isDrawingMode ? "Drawing Mode On (Ctrl+Z to undo)" : "Drawing Mode Off"}
            >
              {isDrawingMode ? 'Drawing Mode On' : 'Drawing Mode Off'}
            </button>
            <button
              onClick={() => setRectangles([])}
              className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
              title="Clear all rectangles"
            >
              Clear All
            </button>
            <button
              onClick={() => navigate('/drawings/add')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Upload Different Files
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-4 items-center justify-center">
          <button
            onClick={() => setPdfScale(prev => Math.min(2, prev + 0.1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Zoom In
          </button>
          <button
            onClick={() => setPdfScale(prev => Math.max(0.5, prev - 0.1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Zoom Out
          </button>
          
          <select
            value={currentFileIndex}
            onChange={handleFileChange}
            className="px-3 py-2 border rounded"
          >
            {pdfFiles.map((file, index) => (
              <option key={index} value={index}>
                {file.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="py-2">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-lg mb-6 h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="flex flex-col items-center">


            <div className="flex justify-center">
              <div className="relative">
                <Document
                  file={pdfFiles[currentFileIndex]}
                  onLoadSuccess={onDocumentLoadSuccess}
                  className="bg-white shadow-lg rounded"
                >
                  <Page
                    key={`page_${pageNumber}_${currentFileIndex}`}
                    pageNumber={pageNumber}
                    className="bg-black"
                    scale={pdfScale}
                    onLoadSuccess={({ width }) => {
                      if (canvasRef.current) {
                        const pdfElement = canvasRef.current.parentElement?.querySelector('.react-pdf__Page') as HTMLElement;
                        if (pdfElement) {
                          const { width: renderedWidth, height: renderedHeight } = pdfElement.getBoundingClientRect();
                          canvasRef.current.width = renderedWidth;
                          canvasRef.current.height = renderedHeight;
                          canvasRef.current.style.width = `${renderedWidth}px`;
                          canvasRef.current.style.height = `${renderedHeight}px`;
                          drawRectangles();
                        }
                      }
                    }}
                  />
                </Document>
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0"
                  style={{
                    cursor: isDrawingMode ? 'crosshair' : 'default',
                    pointerEvents: isDrawingMode ? 'auto' : 'none',
                    zIndex: 10
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>

          </div>

        </div>
      </div>
      <div className="flex-1 max-w-xs">
        <select
          value={selectedPartType || ''}
          onChange={(e) => setSelectedPartType(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border rounded"
          disabled={isLoading}
        >
          <option value="">Select a part type</option>
          {partTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add OCR Results Display */}
      <div className="w-full max-w-6xl mt-4">
        <h2 className="text-xl font-bold mb-2">OCR Results</h2>
        {isProcessing && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
            {error}
          </div>
        )}
        <div className="space-y-4">
          {rectangles.map((rect, index) => (
            <div key={index} className="p-4 border rounded">
              <h3 className="font-bold">Rectangle {index + 1}</h3>
              <div className="text-sm text-gray-600 mb-2">
                PDF Coordinates: ({Math.round(rect.startX/rect.scale)}, {Math.round(rect.startY/rect.scale)})
                Size: {Math.round(rect.width/rect.scale)}x{Math.round(rect.height/rect.scale)}
              </div>
              {rect.image && (
                <div className="mb-4">
                  <p className="font-semibold mb-2">Extracted Region:</p>
                  <img 
                    src={`data:image/png;base64,${rect.image.base64}`}
                    alt={`Extracted region ${index + 1}`}
                    className="border rounded shadow-sm"
                    style={{
                      maxWidth: '100%',
                      height: 'auto'
                    }}
                  />
                  <p className="font-semibold mb-2">GPT Response:</p>
                  <pre className="text-sm text-gray-600 p-2 bg-gray-100 rounded">
                    {JSON.stringify(rect.parsed_response, null, 2)}
                  </pre>
                </div>
              )}
              {!rect.processed ? (
                <p className="text-gray-500">Processing...</p>
              ) : !rect.image ? (
                <p className="text-red-500">Failed to extract region</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>

  );
};

export default DrawingLabelingPage; 