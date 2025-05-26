import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Dimension {
  id: number;
  name: string;
  unit: string;
}

interface PartType {
  id: number;
  name: string;
  dimensions: Dimension[];
}

const PartSearch: React.FC = () => {
  const navigate = useNavigate();
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [selectedPartType, setSelectedPartType] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [dimensionValues, setDimensionValues] = useState<Record<number, string>>({});
  const [dimensionTols, setDimensionTols] = useState<Record<number, string>>({});
  const [partNumber, setPartNumber] = useState('');
  const [partTol, setPartTol] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    const fetchDimensions = async () => {
      if (selectedPartType) {
        try {
          const response = await fetch(`http://localhost:8000/part-types/${selectedPartType}/dimensions`);
          if (!response.ok) {
            throw new Error('Failed to fetch dimensions');
          }
          const data = await response.json();
          setDimensions(data);
          
          // Reset dimension values and tolerances when part type changes
          setDimensionValues({});
          setDimensionTols({});
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } else {
        setDimensions([]);
      }
    };

    fetchDimensions();
  }, [selectedPartType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    
    // Add dimensions and tolerances to search params
    dimensions.forEach(dim => {
      const value = dimensionValues[dim.id];
      const tol = dimensionTols[dim.id];
      if (value) {
        params.append(`dim${dim.id}`, value);
        if (tol) {
          params.append(`tol${dim.id}`, tol);
        }
      }
    });

    // Add part number and tolerance if provided
    if (partNumber) {
      params.append('partNumber', partNumber);
      if (partTol) {
        params.append('partTol', partTol);
      }
    }

    // Add part type if selected
    if (selectedPartType) {
      params.append('partType', selectedPartType.toString());
    }

    // Navigate to results page with search parameters
    navigate({
      pathname: '/search/results',
      search: params.toString()
    });
  };

  if (isLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">Search for a part</h1>
        
        <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto space-y-4 mb-8">
          {/* Part Type Selector */}
          <div className="mb-6">
            <select
              value={selectedPartType || ''}
              onChange={(e) => setSelectedPartType(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full p-2 rounded border border-gray-300"
            >
              <option value="">Select a part type</option>
              {partTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Dimension Fields */}
          {dimensions.map((dim) => (
            <div key={dim.id} className="flex gap-4">
              <input
                type="text"
                placeholder={`${dim.name} (${dim.unit})`}
                value={dimensionValues[dim.id] || ''}
                onChange={(e) => {
                  setDimensionValues(prev => ({
                    ...prev,
                    [dim.id]: e.target.value
                  }));
                }}
                className="flex-1 p-2 rounded border border-gray-300"
              />
              <input
                type="text"
                placeholder="tol."
                value={dimensionTols[dim.id] || ''}
                onChange={(e) => {
                  setDimensionTols(prev => ({
                    ...prev,
                    [dim.id]: e.target.value
                  }));
                }}
                className="w-20 p-2 rounded border border-gray-300"
              />
            </div>
          ))}

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="part number"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="flex-1 p-2 rounded border border-gray-300"
            />
            <input
              type="text"
              placeholder="tol."
              value={partTol}
              onChange={(e) => setPartTol(e.target.value)}
              className="w-20 p-2 rounded border border-gray-300"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-2 px-4 bg-[#5B4DA7] text-white rounded hover:bg-[#4B3D97]"
          >
            search
          </button>
        </form>
      </div>
    </div>
  );
};

export default PartSearch; 