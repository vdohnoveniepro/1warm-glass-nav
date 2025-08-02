import React from 'react';
import Link from 'next/link';

interface AdminTitleProps {
  title: string;
  backUrl?: string;
  backText?: string;
  children?: React.ReactNode;
}

const AdminTitle: React.FC<AdminTitleProps> = ({ 
  title, 
  backUrl = '/admin', 
  backText = 'Вернуться в панель управления',
  children 
}) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{title}</h1>
      
      {backUrl && (
        <Link href={backUrl} className="inline-block mb-4 text-[#48a9a6] hover:underline">
          ← {backText}
        </Link>
      )}
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default AdminTitle; 