import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

const AddDrawings: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResults, setOCRResults] = useState<Record<number, OCRResult[]>>({});
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      
      try {
        // Store the file in sessionStorage
        const reader = new FileReader();
        reader.onload = () => {
          sessionStorage.setItem('currentPDF', reader.result as string);
          // Navigate to the labeling page
          navigate('/drawings/labeling', {
            state: { fileName: file.name }
          });
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload failed:', error);
        // TODO: Show error message to user
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleOCRComplete = (results: Record<number, OCRResult[]>) => {
    setOCRResults(results);
    console.log('OCR Results:', results);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 text-center">Add drawings</h1>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl mb-4 text-center">Upload a drawing for OCR</h2>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center ${
              isUploading ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="fileUpload"
              disabled={isUploading}
            />
            <label
              htmlFor="fileUpload"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="w-16 h-16 mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                ↑
              </div>
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <p className="mb-2">Processing...</p>
                  <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <p className="mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">Select a PDF file for OCR processing</p>
                </>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDrawings; 