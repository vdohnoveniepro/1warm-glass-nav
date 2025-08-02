import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Услуги - Вдохновение',
  description: 'Наши услуги для вашего здоровья и красоты. Широкий спектр профессиональных услуг для заботы о себе.',
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 