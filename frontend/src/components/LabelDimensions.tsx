import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DimensionMapping {
  [ocrValue: string]: string | null;
}

interface LabelDimensionsProps {
  drawingUrl: string;
  detectedDimensions: string[];
  dimensionLabels: string[];
  totalDrawings?: number;
  currentIndex?: number;
  onSubmit: (mapping: { file_path: string; tags: Record<string, string> }) => Promise<void>;
  onNextDrawing?: () => void;
}

const LabelDimensions: React.FC<LabelDimensionsProps> = ({
  drawingUrl,
  detectedDimensions,
  dimensionLabels,
  totalDrawings,
  currentIndex = 0,
  onSubmit,
  onNextDrawing,
}) => {
  const [dimensionMapping, setDimensionMapping] = useState<DimensionMapping>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

  const handleCheckboxChange = (ocrValue: string, dimensionLabel: string) => {
    setDimensionMapping((prev) => ({
      ...prev,
      [ocrValue]: prev[ocrValue] === dimensionLabel ? null : dimensionLabel,
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const tags: Record<string, string> = {};
      Object.entries(dimensionMapping).forEach(([ocrValue, label]) => {
        if (label) {
          tags[label] = ocrValue;
        }
      });

      await onSubmit({
        file_path: drawingUrl,
        tags,
      });

      if (onNextDrawing) {
        onNextDrawing();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = ({ width, height }: { width: number; height: number }) => {
    setPdfDimensions({ width, height });
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Drawing Preview */}
      <div className="w-full border rounded-lg overflow-hidden bg-gray-50" style={{ minHeight: '600px' }}>
        <Document 
          file={drawingUrl} 
          className="flex justify-center"
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="h-[600px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }
          error={
            <div className="h-[600px] flex items-center justify-center text-red-500">
              Failed to load PDF. Please make sure the file exists and is accessible.
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber}
            className="max-w-full"
            width={window.innerWidth * 0.7}
            onLoadSuccess={onPageLoadSuccess}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* PDF Navigation */}
      {numPages && numPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setPageNumber(page => Math.max(1, page - 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous Page
          </button>
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next Page
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-between items-center">
        <div className="text-lg font-medium">
          Dimensions located: {detectedDimensions.length}
        </div>
        {totalDrawings && (
          <div className="text-gray-600">
            Drawing {currentIndex + 1} of {totalDrawings}
          </div>
        )}
      </div>

      {/* Dimension Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OCR Value
              </th>
              {dimensionLabels.map((label) => (
                <th
                  key={label}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {detectedDimensions.map((ocrValue) => (
              <tr key={ocrValue}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {ocrValue}
                </td>
                {dimensionLabels.map((label) => (
                  <td key={label} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <input
                      type="checkbox"
                      checked={dimensionMapping[ocrValue] === label}
                      onChange={() => handleCheckboxChange(ocrValue, label)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Labels'}
        </button>
        {onNextDrawing && (
          <button
            onClick={onNextDrawing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Next Drawing
          </button>
        )}
      </div>
    </div>
  );
};

export default LabelDimensions; 