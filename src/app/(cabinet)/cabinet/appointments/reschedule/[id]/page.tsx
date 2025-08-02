'use client';

import React, { use } from 'react';
import { Suspense } from 'react';
import ReschedulePageClient from './ReschedulePageClient';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PageParams {
  params: {
    id: string;
  };
}

export default function ReschedulePage({ params }: PageParams) {
  const { id: appointmentId } = use(Promise.resolve(params));
  
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>}>
      <ReschedulePageClient appointmentId={appointmentId} />
    </Suspense>
  );
} 