import { Service } from './service';

export interface ServiceItem {
  id: string;
  title: string;
}

export interface Promo {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  services: ServiceItem[] | string[];
  
  // Дополнительные свойства для поддержки camelCase версий
  isActive?: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  startDate?: string;
  endDate?: string | null;
  maxUses?: number | null;
  currentUses?: number;
}

export interface PromoFormData {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  maxUses: number;
  isActive: boolean;
  services: string[];
} 