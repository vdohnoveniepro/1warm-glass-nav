import { Metadata } from 'next';

// Метаданные по умолчанию для страницы услуги
export const metadata: Metadata = {
  title: 'Подробная информация о услуге - Вдохновение',
  description: 'Подробное описание услуги, специалисты и возможность бронирования'
};

export default function ServiceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 