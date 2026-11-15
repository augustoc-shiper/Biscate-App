import { apiClient } from './client';

export type Plan = {
  id: number;
  name: string;
  days: number;
  priceKz: number;
  highlight: boolean;
};

export type Payment = {
  id: string;
  planId: number;
  professionalId: string;
  entity: string;
  reference: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
};

export async function listPlans(): Promise<Plan[]> {
  const res = await apiClient.get('/plans');
  return (res.data as { data: Plan[] }).data;
}

export async function createPayment(planId: number): Promise<Payment> {
  const res = await apiClient.post('/payments', { planId });
  return (res.data as { data: Payment }).data;
}

export async function listPayments(): Promise<Payment[]> {
  const res = await apiClient.get('/payments');
  return (res.data as { data: Payment[] }).data;
}

export async function confirmPayment(id: string): Promise<Payment> {
  const res = await apiClient.post(`/payments/${id}/confirm`);
  return (res.data as { data: Payment }).data;
}
