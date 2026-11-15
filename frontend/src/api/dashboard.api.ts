import { apiClient } from './client';

export type PendingOffer = {
  id: string;
  price: number;
  message: string;
  status: 'sent' | 'accepted' | 'declined';
  createdAt: string;
  request: {
    id: string;
    description: string;
    status: 'open' | 'in_conversation' | 'done';
  };
};

export type DashboardData = {
  visitas: number;
  contactos: number;
  ratingAvg: number;
  plan: { active: boolean; daysLeft: number };
  pendingOffers: PendingOffer[];
};

export async function getDashboard(): Promise<DashboardData> {
  const res = await apiClient.get('/dashboard');
  return (res.data as { data: DashboardData }).data;
}
