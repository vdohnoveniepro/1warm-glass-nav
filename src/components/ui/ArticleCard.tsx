
import React from 'react';
import { Link } from 'react-router-dom';
import { User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  imageUrl?: string;
  className?: string;
}

const ArticleCard = ({
  id,
  title,
  excerpt,
  author,
  date,
  imageUrl,
  className
}: ArticleCardProps) => {
  return (
    <Link
      to={`/articles/${id}`}
      className={cn(
        "block w-full glass-card rounded-xl overflow-hidden card-hover",
        className
      )}
    >
      {imageUrl && (
        <div className="w-full h-44 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      
      <div className="p-5">
        <h3 className="text-lg font-semibold mb-2 text-warmgray-800">{title}</h3>
        <p className="text-sm text-warmgray-600 line-clamp-2 mb-3">{excerpt}</p>
        
        <div className="flex items-center justify-between text-xs text-warmgray-600">
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            <span>{author}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
