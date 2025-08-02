import { FaStar } from 'react-icons/fa';

interface Testimonial {
  id: string;
  author: string;
  text: string;
  rating: number;
  serviceId: string;
  specialistId: string;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
}

const TestimonialCard = ({ testimonial }: TestimonialCardProps) => {
  // Отображение звезд рейтинга
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={i <= testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}
        />
      );
    }
    return stars;
  };

  return (
    <div className="card">
      <div className="flex gap-2 mb-3">
        {renderStars()}
      </div>
      
      <p className="text-[#4B4B4B] mb-6 italic">"{testimonial.text}"</p>
      
      <div className="flex justify-end">
        <span className="font-medium text-[#6A6A6A]">{testimonial.author}</span>
      </div>
    </div>
  );
};

export default TestimonialCard; 