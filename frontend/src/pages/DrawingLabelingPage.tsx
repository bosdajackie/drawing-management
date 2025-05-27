import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Rectangle {
  startX: number;
  startY: number;
  width: number;
  height: number;
  scale: number;
}

const DrawingLabelingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    setIsDrawing(true);
    setCurrentRect({
      startX: x,
      startY: y,
      width: 0,
      height: 0,
      scale: 1
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isDrawing || !currentRect || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentRect(prev => {
      if (!prev) return null;
      return {
        ...prev,
        width: x - prev.startX,
        height: y - prev.startY
      };
    });
  };

  const stopDrawing = () => {
    if (!isDrawingMode || !currentRect) return;

    setIsDrawing(false);
    setRectangles(prev => [...prev, currentRect]);
    setCurrentRect(null);
  };

  const drawRectangles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    [...rectangles, currentRect].filter(Boolean).forEach(rect => {
      if (!rect) return;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.startX, rect.startY, rect.width, rect.height);
    });
  };

  React.useEffect(() => {
    drawRectangles();
  }, [rectangles, currentRect]);

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
        <div className="flex justify-between mb-4">
          <h1 className="text-3xl font-bold">Label Dimensions</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`px-4 py-2 rounded ${
                isDrawingMode 
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

        <div className="border rounded-lg p-6 bg-white shadow-lg mb-6">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex gap-4 items-center">
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
                    className="bg-white"
                    onLoadSuccess={({ width, height }) => {
                      if (canvasRef.current) {
                        const pdfElement = canvasRef.current.parentElement?.querySelector('.react-pdf__Page');
                        if (pdfElement) {
                          const { width: renderedWidth, height: renderedHeight } = pdfElement.getBoundingClientRect();
                          canvasRef.current.width = renderedWidth;
                          canvasRef.current.height = renderedHeight;
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
                    pointerEvents: isDrawingMode ? 'auto' : 'none'
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
    </div>
  );
};

export default DrawingLabelingPage; 