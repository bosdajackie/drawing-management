import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const DrawingLabelingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  React.useEffect(() => {
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
  }, [location.state, navigate]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
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
                    />
                  </Document>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingLabelingPage; 