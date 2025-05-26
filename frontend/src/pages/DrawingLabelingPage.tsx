import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import LabelDimensions from '../components/LabelDimensions';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface OCRResult {
  value: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

const DrawingLabelingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState<Record<number, OCRResult[]> | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    // Get the PDF data from sessionStorage
    const pdfData = sessionStorage.getItem('currentPDF');
    if (!pdfData) {
      navigate('/drawings/add');
      return;
    }

    // Convert base64 to File object
    const byteString = atob(pdfData.split(',')[1]);
    const mimeString = pdfData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], location.state?.fileName || 'drawing.pdf', { type: mimeString });
    setPdfFile(file);
    
    // Process OCR when file is loaded
    processOCR(file);
  }, [location.state, navigate]);

  const processOCR = async (file: File) => {
    setIsProcessing(true);
    setOcrResults(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        // Assuming the API returns results in format { page_number: OCRResult[] }
        console.log('OCR Results:', data.results);
        // Convert page numbers from string to number if needed
        const formattedResults: Record<number, OCRResult[]> = {};
        Object.entries(data.results).forEach(([pageNum, results]) => {
          formattedResults[parseInt(pageNum)] = results as OCRResult[];
        });
        setOcrResults(formattedResults);
      } else {
        console.error('OCR processing failed:', data.error);
      }
    } catch (error) {
      console.error('Error processing OCR:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const mapCoordinatesToScreen = (ocrCoord: { x: number; y: number; width: number; height: number }) => {
    if (!pdfDimensions) return null;

    // Get the PDF page element
    const pdfElement = document.querySelector('.react-pdf__Page');
    if (!pdfElement) return null;

    const canvas = pdfElement.querySelector('canvas');
    if (!canvas) return null;

    // Get the actual rendered size of the PDF
    const renderedWidth = canvas.width / window.devicePixelRatio;
    const renderedHeight = canvas.height / window.devicePixelRatio;

    // The OCR coordinates seem to be in a coordinate system roughly 2.4x the PDF dimensions
    // PDF is ~841x595, and OCR coords are around 2000x1500
    const OCR_SCALE_FACTOR = 2.4;

    // Normalize the coordinates relative to the PDF dimensions
    const normalizedX = ocrCoord.x / (pdfDimensions.width * OCR_SCALE_FACTOR);
    const normalizedY = ocrCoord.y / (pdfDimensions.height * OCR_SCALE_FACTOR);
    const normalizedWidth = ocrCoord.width / (pdfDimensions.width * OCR_SCALE_FACTOR);
    const normalizedHeight = ocrCoord.height / (pdfDimensions.height * OCR_SCALE_FACTOR);

    // Get the current PDF container size
    const pdfRect = pdfElement.getBoundingClientRect();

    // Map to screen coordinates using the actual rendered PDF size
    const mappedCoords = {
      x: normalizedX * pdfRect.width,
      y: normalizedY * pdfRect.height,
      width: normalizedWidth * pdfRect.width,
      height: normalizedHeight * pdfRect.height
    };

    console.log('PDF dimensions:', pdfDimensions);
    console.log('OCR coordinates:', ocrCoord);
    console.log('Normalized coordinates:', { normalizedX, normalizedY });
    console.log('PDF container size:', pdfRect);
    console.log('Final mapped coordinates:', mappedCoords);
    
    return mappedCoords;
  };

  const onPageLoadSuccess = ({ width, height }: { width: number; height: number }) => {
    setPdfDimensions({ width, height });
  };

  const renderBoundingBoxes = () => {
    if (!ocrResults || !ocrResults[pageNumber]) {
      return null;
    }

    const pdfElement = document.querySelector('.react-pdf__Page');
    if (!pdfElement) return null;

    const pdfRect = pdfElement.getBoundingClientRect();

    // Add debug grid with 50px spacing
    const debugBoxes = [
      <div
        key="debug-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: '3px solid blue',
          pointerEvents: 'none',
          zIndex: 999,
        }}
      />,
      <div
        key="debug-grid"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'linear-gradient(to right, rgba(0,0,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
          zIndex: 998,
        }}
      />,
      <div
        key="debug-center"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '20px',
          height: '20px',
          backgroundColor: 'blue',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 999,
        }}
      />
    ];

    // Add the actual bounding boxes
    const boundingBoxes = ocrResults[pageNumber].map((result, index) => {
      const screenCoords = mapCoordinatesToScreen(result.coordinates);
      if (!screenCoords) return null;

      return (
        <div
          key={`box-${index}`}
          style={{
            position: 'absolute',
            left: `${screenCoords.x}px`,
            top: `${screenCoords.y}px`,
            width: `${screenCoords.width}px`,
            height: `${screenCoords.height}px`,
            border: '2px solid red',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          title={`${result.value} (${result.confidence.toFixed(1)}%)`}
        >
          <span style={{
            position: 'absolute',
            top: '-20px',
            left: 0,
            color: 'red',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '2px',
          }}>
            {`${result.value} (${Math.round(screenCoords.x)},${Math.round(screenCoords.y)})`}
          </span>
        </div>
      );
    });

    return [...debugBoxes, ...boundingBoxes];
  };

  if (!pdfFile) {
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
          <button
            onClick={() => navigate('/drawings/add')}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Upload Different File
          </button>
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-lg mb-6">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex gap-4">
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
              <select
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="px-2 py-2 border rounded"
              >
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={1.0}>100%</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
              </select>
            </div>

            <div className="pdf-container w-full bg-gray-100 rounded-lg overflow-hidden">
              <div className="flex justify-center p-6">
                <div className="relative inline-block">
                  <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="bg-white shadow-lg rounded"
                  >
                    <Page
                      key={`page_${pageNumber}_${scale}`}
                      pageNumber={pageNumber}
                      scale={scale}
                      className="bg-white"
                      onLoadSuccess={onPageLoadSuccess}
                    />
                  </Document>
                  <div 
                    className="absolute top-0 left-0" 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  >
                    {renderBoundingBoxes()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isProcessing ? (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p>Processing OCR...</p>
          </div>
        ) : ocrResults && (
          <div className="border rounded-lg p-6 bg-white shadow-lg mb-6">
            <h2 className="text-xl font-bold mb-4">OCR Results</h2>
            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {JSON.stringify(ocrResults, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingLabelingPage; 