
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedButton from './AnimatedButton';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  specialist: string;
  className?: string;
}

const EventCard = ({
  id,
  title,
  date,
  time,
  specialist,
  className
}: EventCardProps) => {
  return (
    <div className={cn(
      "w-full glass-card rounded-xl p-5",
      className
    )}>
      <h3 className="text-lg font-semibold mb-3 text-warmgray-800">{title}</h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-warmgray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{date}</span>
        </div>
        
        <div className="flex items-center text-sm text-warmgray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span>{time}</span>
        </div>
        
        <div className="flex items-center text-sm text-warmgray-600">
          <User className="w-4 h-4 mr-2" />
          <span>{specialist}</span>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Link to={`/book?event=${id}`} className="flex-1">
          <AnimatedButton fullWidth variant="primary">
            Записаться
          </AnimatedButton>
        </Link>
        <Link to={`/events/${id}`} className="flex-1">
          <AnimatedButton fullWidth variant="outline">
            Подробнее
          </AnimatedButton>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
