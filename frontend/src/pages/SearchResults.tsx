import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Dimension {
  id: number;
  name: string;
  unit: string;
}

interface PartType {
  id: number;
  name: string;
  dimensions: Dimension[]; // This will contain the dimensions associated with the part type
}

interface SearchResult {
  partNumber: string;
  partTypeId: number;
  dimensions: Record<number, string>;
  drawingUrl: string;
}

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(5);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Fetch part types with their associated dimensions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get part types
        const partTypesResponse = await fetch('http://localhost:8000/part-types/');
        if (!partTypesResponse.ok) {
          throw new Error('Failed to fetch part types');
        }
        const partTypesData = await partTypesResponse.json();
        setPartTypes(partTypesData);

        // Get search results
        const params = new URLSearchParams();
        const partTypeId = searchParams.get('partType');
        const partNumber = searchParams.get('partNumber');
        
        if (partTypeId) params.append('part_type_id', partTypeId);
        if (partNumber) params.append('part_number', partNumber);
        
        console.log('Searching with params:', params.toString());
        const searchResponse = await fetch(`http://localhost:8000/search/?${params.toString()}`);
        if (!searchResponse.ok) {
          throw new Error('Failed to fetch search results');
        }
        const searchData = await searchResponse.json();
        console.log('Search results:', searchData);
        setResults(searchData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  const handleViewDrawing = (partNumber: string) => {
    navigate(`/part/${partNumber}`);
  };

  if (isLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  // Get the selected part type
  const selectedPartTypeId = searchParams.get('partType');
  const selectedPartType = selectedPartTypeId 
    ? partTypes.find(pt => pt.id === Number(selectedPartTypeId))
    : null;

  // If we have a selected part type, show its dimensions even if there are no results
  if (selectedPartType) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Search Results</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{selectedPartType.name}</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Part Number</th>
                    {selectedPartType.dimensions.map((dim) => (
                      <th key={dim.id} className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        {dim.name} ({dim.unit})
                      </th>
                    ))}
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">View Drawing</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr 
                      key={result.partNumber}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{result.partNumber}</td>
                      {selectedPartType.dimensions.map((dim) => (
                        <td key={dim.id} className="px-6 py-4 text-sm text-gray-900">
                          {result.dimensions[dim.id] || '-'}
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
          </div>
        </div>

        <div className="mt-4 p-4 border-t flex items-center justify-between bg-white rounded-lg shadow">
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
    );
  }

  // If no part type is selected or no dimensions found
  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Search Results</h1>
      <div className="text-center text-gray-500">
        No results found. Please select a part type to view its dimensions.
      </div>
    </div>
  );
};

export default SearchResults; 