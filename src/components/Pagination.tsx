import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Если всего одна страница, не показываем пагинацию
  if (totalPages <= 1) return null;

  // Определяем диапазон страниц для отображения
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Максимальное количество страниц для отображения
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      {/* Кнопка "Предыдущая страница" */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-2 rounded-md ${
          currentPage === 1
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Предыдущая страница"
      >
        <FaChevronLeft />
      </button>
      
      {/* Первая страница, если она не входит в основной диапазон */}
      {getPageNumbers()[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className={`px-3 py-1 rounded-md ${
              currentPage === 1
                ? 'bg-[#48a9a6] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            1
          </button>
          
          {/* Многоточие после первой страницы */}
          {getPageNumbers()[0] > 2 && (
            <span className="px-3 py-1 text-gray-500">...</span>
          )}
        </>
      )}
      
      {/* Основные страницы */}
      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-md ${
            currentPage === page
              ? 'bg-[#48a9a6] text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {page}
        </button>
      ))}
      
      {/* Последняя страница, если она не входит в основной диапазон */}
      {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
        <>
          {/* Многоточие перед последней страницей */}
          {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
            <span className="px-3 py-1 text-gray-500">...</span>
          )}
          
          <button
            onClick={() => onPageChange(totalPages)}
            className={`px-3 py-1 rounded-md ${
              currentPage === totalPages
                ? 'bg-[#48a9a6] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {totalPages}
          </button>
        </>
      )}
      
      {/* Кнопка "Следующая страница" */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-2 rounded-md ${
          currentPage === totalPages
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Следующая страница"
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

export default Pagination; 