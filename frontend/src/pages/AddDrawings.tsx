import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UploadingFile {
  file: File;
  progress: 'waiting' | 'processing' | 'complete' | 'error';
  error?: string;
}

const AddDrawings: React.FC = () => {
  const navigate = useNavigate();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Check if all files are complete and navigate
  useEffect(() => {
    if (uploadingFiles.length > 0 && uploadingFiles.every(f => f.progress === 'complete')) {
      navigate('/drawings/labeling', {
        state: { 
          fileCount: uploadingFiles.length,
          fileNames: uploadingFiles.map(f => f.file.name)
        }
      });
    }
  }, [uploadingFiles, navigate]);

  const handleContinueWithSuccessful = () => {
    const successfulFiles = uploadingFiles.filter(f => f.progress === 'complete');
    navigate('/drawings/labeling', {
      state: { 
        fileCount: successfulFiles.length,
        fileNames: successfulFiles.map(f => f.file.name)
      }
    });
  };

  const hasSuccessfulFiles = uploadingFiles.some(f => f.progress === 'complete');
  const hasFailedFiles = uploadingFiles.some(f => f.progress === 'error');

  const processFile = async (file: File, index: number) => {
    try {
      // Update file status to processing
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 'processing' } : f
      ));

      // Read and store the file
      const reader = new FileReader();
      const filePromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const fileData = await filePromise;
      sessionStorage.setItem(`currentPDF_${index}`, fileData);

      // Update file status to complete
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 'complete' } : f
      ));
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 'error', error: 'Failed to process file' } : f
      ));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsUploading(true);
      
      // Add all files to uploading state
      setUploadingFiles(files.map(file => ({
        file,
        progress: 'waiting'
      })));

      // Process each file
      files.forEach((file, index) => {
        processFile(file, index);
      });
    }
  };


  const getStatusIcon = (progress: UploadingFile['progress']) => {
    switch (progress) {
      case 'waiting':
        return '⌛';
      case 'processing':
        return <div className="w-4 h-4 border-t-2 border-blue-500 rounded-full animate-spin" />;
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 text-center">Add drawings</h1>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl mb-4 text-center">Upload drawings for OCR</h2>
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
              multiple
            />
            <label
              htmlFor="fileUpload"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="w-16 h-16 mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                ↑
              </div>
              {isUploading && uploadingFiles.length === 0 ? (
                <div className="flex flex-col items-center">
                  <p className="mb-2">Processing...</p>
                  <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <p className="mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">Select PDF files for OCR processing</p>
                </>
              )}
            </label>
          </div>

          {/* File List */}
          {uploadingFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Uploading Files</h3>
              <div className="space-y-2">
                {uploadingFiles.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      file.progress === 'error' ? 'border-red-300 bg-red-50' :
                      file.progress === 'complete' ? 'border-green-300 bg-green-50' :
                      'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {getStatusIcon(file.progress)}
                      </span>
                      <span className="truncate max-w-xs">{file.file.name}</span>
                    </div>
                    {file.error && (
                      <span className="text-sm text-red-600">{file.error}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Show continue button when there are both successful and failed files */}
              {hasSuccessfulFiles && hasFailedFiles && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleContinueWithSuccessful}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Continue with Successful Files ({uploadingFiles.filter(f => f.progress === 'complete').length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDrawings; 