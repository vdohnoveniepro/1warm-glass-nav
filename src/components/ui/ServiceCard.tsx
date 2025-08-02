
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  id: string;
  title: string;
  duration: string;
  price: string;
  specialist?: string;
  className?: string;
  image?: string;
}

const ServiceCard = ({
  id,
  title,
  duration,
  price,
  specialist,
  className,
  image
}: ServiceCardProps) => {
  return (
    <Link
      to={`/services/${id}`}
      className={cn(
        "block w-full frosted-glass rounded-xl p-5 hover:shadow-lg hover:translate-y-[-5px] transition-all duration-300",
        className
      )}
    >
      {image && (
        <div className="w-full h-36 mb-3 rounded-lg overflow-hidden">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-2 text-gray-800">{title}</h3>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span className="text-sm">{duration}</span>
        </div>
        <div className="font-medium text-indigo-600">{price} ₽</div>
      </div>
      
      {specialist && (
        <div className="flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-1" />
          <span>{specialist}</span>
        </div>
      )}
    </Link>
  );
};

export default ServiceCard;
