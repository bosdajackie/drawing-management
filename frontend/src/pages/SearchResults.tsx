import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Dimension {
  id: number;
  name: string;
  unit: string;
}

interface SearchResult {
  partNumber: string;
  dimensions: Record<number, string>; // Changed to map dimension IDs to values
  drawingUrl: string;
}

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(5); // This would come from your API
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dimensions from the API
  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const response = await fetch('http://localhost:8000/dimensions/');
        if (!response.ok) {
          throw new Error('Failed to fetch dimensions');
        }
        const data = await response.json();
        setDimensions(data);
      } catch (error) {
        console.error('Error fetching dimensions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDimensions();
  }, []);

  // Mock data - replace with actual API call
  const [results] = useState<SearchResult[]>([
    {
      partNumber: 'ABC123',
      dimensions: {
        1: '47.5',
        2: '30.0',
        3: '161.5',
        4: '42.3'
      },
      drawingUrl: '/placeholder-drawing.png'
    },
    {
      partNumber: 'DEF456',
      dimensions: {
        1: '50.0',
        2: '32.5',
        3: '158.0',
        4: '44.0'
      },
      drawingUrl: '/placeholder-drawing.png'
    },
    {
      partNumber: 'GHI789',
      dimensions: {
        1: '45.0',
        2: '28.5',
        3: '160.0',
        4: '41.5'
      },
      drawingUrl: '/placeholder-drawing.png'
    },
    {
      partNumber: 'JKL012',
      dimensions: {
        1: '48.5',
        2: '31.0',
        3: '159.5',
        4: '43.0'
      },
      drawingUrl: '/placeholder-drawing.png'
    },
    {
      partNumber: 'MNO345',
      dimensions: {
        1: '46.0',
        2: '29.5',
        3: '162.0',
        4: '42.0'
      },
      drawingUrl: '/placeholder-drawing.png'
    },
    {
      partNumber: 'PQR678',
      dimensions: {
        1: '49.0',
        2: '30.5',
        3: '160.5',
        4: '43.5'
      },
      drawingUrl: '/placeholder-drawing.png'
    }
  ]);

  const handleViewDrawing = (partNumber: string) => {
    navigate(`/part/${partNumber}`);
  };

  if (isLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Search Results</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">part number</th>
                {dimensions.map((dim) => (
                  <th key={dim.id} className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    {dim.name} ({dim.unit})
                  </th>
                ))}
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">view drawing</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr 
                  key={result.partNumber}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-6 py-4 text-sm text-gray-900">{result.partNumber}</td>
                  {dimensions.map((dim) => (
                    <td key={dim.id} className="px-6 py-4 text-sm text-gray-900">
                      {result.dimensions[dim.id] ? `${result.dimensions[dim.id]} ${dim.unit}` : '-'}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleViewDrawing(result.partNumber)}
                      className="inline-block"
                    >
                      <img 
                        src={result.drawingUrl} 
                        alt={`Drawing for part ${result.partNumber}`}
                        className="w-16 h-16 object-cover border border-gray-200 rounded"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 text-sm rounded-md ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 text-sm rounded-md ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#5B4DA7] text-white hover:bg-[#4B3D97]'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults; 