import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Article, Author } from '@/components/Blog/types';
import { FaUser, FaCalendarAlt } from 'react-icons/fa';

interface BlogPost {
  id: string;
  title: string;
  preview: string;
  imageUrl: string;
  date: string;
  author: string;
  tags: string[];
}

interface BlogPreviewProps {
  post: BlogPost;
}

const BlogPreview = ({ post }: BlogPreviewProps) => {
  // Форматируем дату
  const formattedDate = format(new Date(post.date), 'd MMMM yyyy', { locale: ru });

  return (
    <div className="card overflow-hidden group">
      <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
        <Image
          src={post.imageUrl}
          alt={post.title}
          fill
          style={{ objectFit: 'cover' }}
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {post.tags.map((tag: string) => (
          <Link 
            key={tag} 
            href={`/blog/tag/${tag}`}
            className="bg-[#EAE8E1] text-[#6A6A6A] py-1 px-3 rounded-full text-xs hover:bg-[#F0B7A4] hover:text-white transition-colors"
          >
            #{tag}
          </Link>
        ))}
      </div>
      
      <h3 className="text-xl font-bold mb-2 text-[#4B4B4B]">{post.title}</h3>
      <p className="text-[#6A6A6A] mb-4">{post.preview}</p>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-[#6A6A6A]">
          <span>{formattedDate}</span>
          <span className="mx-2">•</span>
          <span>{post.author}</span>
        </div>
        <Link href={`/blog/${post.id}`} className="text-[#F0B7A4] hover:underline">
          Читать
        </Link>
      </div>
    </div>
  );
};

export default BlogPreview; 