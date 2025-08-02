import { Metadata } from 'next';
import ClientWrapper from './ClientWrapper';

export const metadata: Metadata = {
  title: 'Вдохновение - Telegram Mini App',
  description: 'Центр психологической помощи Вдохновение - Telegram Mini App',
};

export default function TelegramPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientWrapper />
    </div>
  );
} 