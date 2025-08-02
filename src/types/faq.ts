export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  order: number;
  isActive?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFAQRequest {
  question: string;
  answer: string;
  category?: string;
  isActive?: number;
}

export interface UpdateFAQRequest {
  question?: string;
  answer?: string;
  category?: string;
  order?: number;
  isActive?: number;
} 