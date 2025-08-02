import { Suspense } from 'react';
import ProfileClient from './ProfileClient';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
          <p className="mt-4 text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    }>
      <ProfileClient />
    </Suspense>
  );
} 