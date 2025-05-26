import React from 'react';
import { useParams } from 'react-router-dom';

const PartDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Part Details: {id}</h1>
        <button
          className="px-4 py-2 bg-[#5B4DA7] text-white rounded hover:bg-[#4B3D97]"
        >
          Edit Part
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Part Information */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Dimensions</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="font-medium">Dimension 1:</div>
              <div>161.5 mm</div>
              <div className="font-medium">Dimension 2:</div>
              <div>47.5 mm</div>
              <div className="font-medium">Dimension 3:</div>
              <div>30.0 mm</div>
              <div className="font-medium">Dimension 4:</div>
              <div>42.3 mm</div>
            </div>
          </div>
        </div>

        {/* Drawing Preview */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Drawing</h2>
          <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
            Drawing Preview
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              View Full Drawing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartDetail; 