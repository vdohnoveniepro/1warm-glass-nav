import { FaPlus, FaTrash } from 'react-icons/fa';

type Service = {
  id: string;
  name: string;
  color: string;
};

interface ServiceTagProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}

const ServiceTag = ({ service, isSelected, onClick }: ServiceTagProps) => {
  const colorMap: Record<string, { bg: string, text: string, bgSelected: string, textSelected: string }> = {
    green: { 
      bg: 'bg-green-50', text: 'text-green-700',
      bgSelected: 'bg-green-100', textSelected: 'text-green-800' 
    },
    blue: { 
      bg: 'bg-blue-50', text: 'text-blue-700',
      bgSelected: 'bg-blue-100', textSelected: 'text-blue-800' 
    },
    purple: { 
      bg: 'bg-purple-50', text: 'text-purple-700',
      bgSelected: 'bg-purple-100', textSelected: 'text-purple-800' 
    },
    pink: { 
      bg: 'bg-pink-50', text: 'text-pink-700',
      bgSelected: 'bg-pink-100', textSelected: 'text-pink-800' 
    },
    amber: { 
      bg: 'bg-amber-50', text: 'text-amber-700',
      bgSelected: 'bg-amber-100', textSelected: 'text-amber-800' 
    },
    indigo: { 
      bg: 'bg-indigo-50', text: 'text-indigo-700',
      bgSelected: 'bg-indigo-100', textSelected: 'text-indigo-800' 
    },
  };
  
  const { bg, text, bgSelected, textSelected } = colorMap[service.color] || { 
    bg: 'bg-gray-50', text: 'text-gray-700',
    bgSelected: 'bg-gray-100', textSelected: 'text-gray-800'
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full text-sm font-medium mr-2 mb-2 flex items-center ${
        isSelected 
          ? `${bgSelected} ${textSelected} ring-2 ring-offset-2 ring-[#48a9a6]` 
          : `${bg} ${text} hover:bg-opacity-80`
      }`}
    >
      {isSelected ? (
        <FaTrash size={12} className="mr-1" />
      ) : (
        <FaPlus size={12} className="mr-1" />
      )}
      {service.name}
    </button>
  );
};

export default ServiceTag; 