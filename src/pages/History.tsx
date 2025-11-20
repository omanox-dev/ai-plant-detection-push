import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlantHistory from '@/components/PlantHistory';

const History = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Plant Care</span>
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Plant Analysis History</h1>
        </div>

        {/* Plant History Component */}
        <PlantHistory />
      </div>
    </div>
  );
};

export default History;